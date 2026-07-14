import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use json middleware for API routes
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Proxy route for Pennylane API to prevent CORS
  app.all("/api/pennylane/*", async (req, res) => {
    try {
      const urlObj = new URL(req.url, 'http://localhost');
      const subPath = urlObj.pathname.replace(/^\/api\/pennylane\//, '');
      const targetUrl = `https://app.pennylane.com/api/external/v2/${subPath}${urlObj.search}`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (req.headers['authorization']) {
        headers['Authorization'] = req.headers['authorization'] as string;
      }
      if (req.headers['x-company-token']) {
        headers['X-Company-Token'] = req.headers['x-company-token'] as string;
      }

      const fetchOptions: RequestInit = {
        method: req.method,
        headers,
      };

      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        fetchOptions.body = JSON.stringify(req.body);
      }

      const response = await fetch(targetUrl, fetchOptions);
      
      const responseText = await response.text();
      res.status(response.status);
      
      try {
        const json = JSON.parse(responseText);
        res.json(json);
      } catch {
        res.send(responseText);
      }
    } catch (error: any) {
      console.error("Pennylane Proxy Error:", error);
      res.status(500).json({ error: error.message || "Internal Server Error in Proxy" });
    }
  });

  // For Dropbox files/upload, we parse as raw Buffer to handle binary file stream properly
  app.use("/api/dropbox/files/upload", express.raw({ type: 'application/octet-stream', limit: '50mb' }));

  // Proxy route for Dropbox API to prevent CORS
  app.all("/api/dropbox/*", async (req, res) => {
    try {
      const urlObj = new URL(req.url, 'http://localhost');
      const subPath = urlObj.pathname.replace(/^\/api\/dropbox\//, '');
      
      const isContent = subPath.includes("files/upload") || subPath.includes("files/download");
      const baseUrl = isContent ? "https://content.dropboxapi.com/2/" : "https://api.dropboxapi.com/2/";
      const targetUrl = `${baseUrl}${subPath}${urlObj.search}`;

      const headers: Record<string, string> = {};

      if (req.headers['authorization']) {
        headers['Authorization'] = req.headers['authorization'] as string;
      }
      if (req.headers['dropbox-api-arg']) {
        headers['Dropbox-API-Arg'] = req.headers['dropbox-api-arg'] as string;
      }

      const fetchOptions: RequestInit = {
        method: req.method,
        headers,
      };

      if (isContent) {
        headers['Content-Type'] = 'application/octet-stream';
        fetchOptions.body = req.body;
      } else {
        headers['Content-Type'] = 'application/json';
        fetchOptions.body = JSON.stringify(req.body);
      }

      const response = await fetch(targetUrl, fetchOptions);
      const responseText = await response.text();
      res.status(response.status);

      try {
        const json = JSON.parse(responseText);
        res.json(json);
      } catch {
        res.send(responseText);
      }
    } catch (error: any) {
      console.error("Dropbox Proxy Error:", error);
      res.status(500).json({ error: error.message || "Internal Server Error in Dropbox Proxy" });
    }
  });

  // GÉODAE Atlasanté API upload endpoint
  app.post("/api/atlasante/upload", async (req, res) => {
    try {
      const { atlasanteUrlAuth, atlasanteDeclarantId, items } = req.body;

      if (!atlasanteUrlAuth || !atlasanteDeclarantId) {
        return res.status(400).json({ error: "Missing GÉODAE configuration fields (URL Auth or Identifiant)" });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "No defibrillators to upload" });
      }

      // Step 1: Authenticate with GÉODAE
      const authUrl = atlasanteUrlAuth || 'https://catalogue.atlasante.fr/api/login';
      const authHeaderValue = atlasanteDeclarantId.startsWith('Basic ') ? atlasanteDeclarantId : `Basic ${atlasanteDeclarantId}`;

      console.log(`[GÉODAE] Authenticating with ${authUrl}...`);
      const authResponse = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeaderValue,
          'Content-Type': 'application/json'
        }
      });

      if (!authResponse.ok) {
        const errText = await authResponse.text();
        return res.status(401).json({ 
          error: `Authentication failed on GÉODAE server. Status: ${authResponse.status}`,
          details: errText
        });
      }

      // Extract Set-Cookie header
      const setCookieHeader = authResponse.headers.get('set-cookie');
      let phpSessId = '';
      if (setCookieHeader) {
        const match = setCookieHeader.match(/PHPSESSID=([^;]+)/);
        if (match) {
          phpSessId = match[1];
        }
      }

      // As backup, check if there's any other way or try to look inside headers
      if (!phpSessId && (authResponse.headers as any).getSetCookie) {
        const cookiesList = (authResponse.headers as any).getSetCookie();
        for (const cookie of cookiesList) {
          const match = cookie.match(/PHPSESSID=([^;]+)/);
          if (match) {
            phpSessId = match[1];
            break;
          }
        }
      }

      if (!phpSessId) {
        console.warn("[GÉODAE] Warning: Authenticated but PHPSESSID was not found in headers.");
      }

      // Determine upload url
      let uploadUrl = 'https://catalogue.atlasante.fr/api/data/8777a504-6c3e-4abe-8100-60bb58767faa';
      try {
        const parsed = new URL(authUrl);
        uploadUrl = `${parsed.origin}/api/data/8777a504-6c3e-4abe-8100-60bb58767faa`;
      } catch (e) {}

      const results = [];

      // Step 2: Upload each DAE one by one
      for (const item of items) {
        const { id, identifiant, numeroSerie, geojson } = item;
        try {
          console.log(`[GÉODAE] Uploading DAE ${identifiant} (${numeroSerie}) to ${uploadUrl}...`);
          const headers: Record<string, string> = {
            'Content-Type': 'application/json'
          };
          if (phpSessId) {
            headers['Cookie'] = `PHPSESSID=${phpSessId}`;
          }

          const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(geojson)
          });

          const responseText = await uploadResponse.text();
          if (uploadResponse.ok) {
            let parsedRes = null;
            try {
              parsedRes = JSON.parse(responseText);
            } catch (e) {}

            results.push({
              id,
              identifiant,
              numeroSerie,
              success: true,
              data: parsedRes || responseText
            });
          } else {
            results.push({
              id,
              identifiant,
              numeroSerie,
              success: false,
              error: `Status ${uploadResponse.status}`,
              details: responseText
            });
          }
        } catch (itemErr: any) {
          results.push({
            id,
            identifiant,
            numeroSerie,
            success: false,
            error: itemErr.message || "Network Error"
          });
        }
      }

      res.json({ success: true, results });
    } catch (err: any) {
      console.error("[GÉODAE] Proxy Upload Error:", err);
      res.status(500).json({ error: err.message || "Internal Server Error in GÉODAE upload" });
    }
  });

  // CORS support and endpoint for CRM website form embedding
  app.use("/api/crm/embed-lead", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Max-Age", "86400");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  app.post("/api/crm/embed-lead", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");
    try {
      const { tenantId, name, email, message, redirectUrl } = req.body;
      
      if (!email || !message) {
        const errMsg = "Tous les champs (email, message) sont obligatoires.";
        return res.status(400).json({ success: false, error: errMsg });
      }
      
      const targetTenantId = tenantId || "demo";
      const collectionKey = targetTenantId === "demo" ? "tickets" : `${targetTenantId}_tickets`;
      
      // Fetch existing tickets from Firestore
      const docRef = doc(db, 'appData', collectionKey);
      const snap = await getDoc(docRef);
      let tickets: any[] = [];
      if (snap.exists()) {
        tickets = snap.data().value || [];
      }
      
      const randomId = `#${Math.floor(100000 + Math.random() * 900000)}`;
      const newTicket = {
        id: randomId,
        identifiant: "",
        objet: "Formulaire intégré",
        message: `[Message depuis le site web]\n${message}`,
        email: email,
        phone: "-",
        date: new Date().toISOString().replace('T', ' ').substring(0, 19),
        status: "Nouveau",
        envId: targetTenantId,
        tenantId: targetTenantId
      };
      
      tickets.unshift(newTicket);
      await setDoc(docRef, { value: tickets });
      
      // If redirectUrl is supplied, redirect there
      if (redirectUrl) {
        return res.redirect(redirectUrl);
      }
      
      return res.json({ success: true, message: "Message envoyé avec succès." });
    } catch (error: any) {
      console.error("Error saving embed lead:", error);
      const errMsg = error.message || "Une erreur est survenue lors de l'envoi du message.";
      return res.status(500).json({ success: false, error: errMsg });
    }
  });

  // API health route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
