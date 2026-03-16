# 🚀 DroneWatch AI - Card-Free Cloud Deployment Guide

Since Render.com and Koyeb now require a credit card for verification, the best **100% Free & Card-Free** option is **Hugging Face Spaces**.

---

## Best Option: Hugging Face Spaces (Truly Free & No Card)
Hugging Face is the home of AI and is perfect for hosting your YOLO backend.

1.  **Create an Account**: Sign up at [huggingface.co](https://huggingface.co) (No credit card needed).
2.  **Create a Space**: Go to [huggingface.co/spaces](https://huggingface.co/spaces) and click **"Create new Space"**.
3.  **Configure Space**:
    *   **Space Name**: `drone-api` (or whatever you like).
    *   **SDK**: Select **Docker**.
    *   **Template**: Choose **Blank**.
    *   **Space Hardware**: Keep it on **"CPU Basic"** (Free).
    *   **Visibility**: **Public** (Important so your app can reach it).
4.  **Upload Your Files**:
    *   Once the space is created, go to the **"Files"** tab.
    *   Click **"Add file" > "Upload files"**.
    *   Upload everything inside your `backend/` folder (including the `Dockerfile`, `main.py`, `requirements.txt`, and your `best.pt` model).
5.  **Add Your Database Key**:
    *   Go to the **"Settings"** tab of your Space.
    *   Look for **"Variables and Secrets"**.
    *   Click **"New secret"**.
    *   Name: `MONGODB_URI`
    *   Value: *[Paste your MongoDB Atlas Connection String here]*
6.  **Wait for Build**: Hugging Face will automatically start building your Docker container. Once it says **"Running"**, you are live!
7.  **Get Your URL**: Your URL will look like: `https://yourusername-drone-api.hf.space`

---

## Other Options (Require Credit Card)
*   **Koyeb**: Great performance, but asks for a card for verification.
*   **Render**: Very stable, but also asks for a card for their "Blueprint" feature.

---

---

## 🛠️ How to get your MongoDB Atlas URI

1.  **Log in**: Go to [cloud.mongodb.com](https://cloud.mongodb.com).
2.  **Find your Cluster**: On your Dashboard, find your cluster (usually named `Cluster0`).
3.  **Click "Connect"**: This button is right next to your cluster name.
4.  **Choose "Drivers"**: Under "Connect to your application", click **"Drivers"**.
5.  **Copy the URI**: You will see a string like:
    `mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority`
6.  **Update Placeholders**: 
    *   Replace `<username>` with your database user's name.
    *   Replace `<password>` with your database user's password.
7.  **Network Access**: Ensure you have allowed access from anywhere. Go to **"Network Access"** in the left sidebar and make sure `0.0.0.0/0` is added to the whitelist.

---

---

## 🔗 How to get your Direct Space URL

To make the app work, you need the **Direct API Link**, not just the browser URL.

1.  In your Hugging Face Space, click the **three dots (⋮)** in the top right corner.
2.  Select **"Embed this Space"**.
3.  Copy the **"Direct URL"** (it will look like `https://username-space.hf.space`).
4.  **Note**: Make sure it does NOT end in `/`.

---

## 🚀 Step 3: Deploying the Website to Vercel (100% Free)

Since your backend is now in the cloud, running the website locally can cause "CORS" errors. Hosting it on Vercel is the professional fix.

1.  **GitHub Push**: Make sure your `pc-web-app` folder is pushed to GitHub.
2.  **Connect to Vercel**:
    *   Go to [vercel.com](https://vercel.com) and log in with GitHub.
    *   Click **"Add New" > "Project"**.
    *   Import your repository.
3.  **Project Settings**:
    *   **Root Directory**: Click "Edit" and select `pc-web-app`.
    *   **Framework Preset**: Vite (should be auto-detected).
4.  **Environment Variables** (Optional but good):
    *   You can set your API URL here or just keep it in your code as you already did.
5.  **Deploy**: Click **"Deploy"**. 
6.  **Done!**: You will get a link like `https://drone-detection.vercel.app`. Your website is now live!

---

## 📱 Step 4: Building the Android App (APK)

1.  **EAS Build**: Run `npx eas build -p android --profile preview` in your `android-app` folder.
2.  **Install**: Once the build finishes, download the `.apk` and install it on any Android phone.

---

**You have now built a professional-grade, cloud-hosted AI platform!**

## 💻 Running the Frontends

### 1. Update the API URLs
Before running, you must tell the apps where your new server is:
*   **Android App**: Open `android-app/api.ts` -> Update `API_BASE_URL` with your Hugging Face Direct URL.
*   **Web App**: Open `pc-web-app/src/api.ts` -> Update `API_URL` with your Hugging Face Direct URL.

### 2. Run the PC Web App
```bash
cd pc-web-app
npm install
npm run dev
```
*Your browser will open to the dashboard.*

### 3. Run the Android App
```bash
cd android-app
npm install
npx expo start
```
*   Scan the QR code with the **Expo Go** app on your phone.
*   **Yes**, you still need to run the `npx expo start` command on your PC to "stream" the app to your phone for testing.
*   The big difference now is that your phone and PC **no longer** need to be on the same Wi-Fi! You can be on mobile data and it will still detect drones perfectly.

---

## 🌐 Deploying the PC Web App (Vercel - 100% Free)

To make your website live for everyone on the internet (not just localhost):

1.  **Push your code to GitHub**: Ensure the `pc-web-app/` folder is in your repo.
2.  **Sign up at [Vercel.com](https://vercel.com)**: Connect your GitHub.
3.  **New Project**:
    *   Select your repository.
    *   **Root Directory**: Set this to `pc-web-app`.
    *   **Framework Preset**: Vite.
4.  **Deploy**: Vercel will give you a public website URL like `https://drone-watch-ai.vercel.app`.

---

## 📱 Making the Android App "Public"

You don't "host" a mobile app in the cloud, but you can build a file (APK) that others can install.

1.  **Build the APK**:
    ```bash
    cd android-app
    # This requires an Expo account (Free)
    npx eas build -p android --profile preview
    ```
2.  **Download**: Expo will give you a link to download the `.apk` file.
3.  **Share**: You can upload this APK to Google Drive, Telegram, or any site, and anyone can download and install it on their phone!

---

## 🛠️ Troubleshooting Connection Errors

If you see **"An error occurred"** in the web app:

1.  **CORS & Credentials**: In some browsers, if `allow_credentials` is true, the server cannot use `*` for origins.
2.  **Direct URL Only**: Ensure you are using the **Direct URL** from the "Embed" tab in Hugging Face, **not** the website URL in your browser bar.
3.  **Mixed Content**: If the website is HTTPS (like on Vercel) and the API is HTTPS (Hugging Face), it will work. Localhost (HTTP) calling HTTPS (HF) also usually works.
4.  **Database**: Double check that your `MONGODB_URI` secret in Hugging Face has the correct password and that you added `0.0.0.0/0` in MongoDB Atlas Network Access.

---

**Congratulations!** You now have a global, cloud-powered AI drone detection platform.
