# Predictive AI Healthcare Insighter

**Demo Video:** [Demo](https://www.youtube.com/watch?v=WfQ6cVL-SXc)  
**Privacy Policy:** [View Here](https://meld-rx-predictive-ai-application.vercel.app/privacy-policy)  
**Terms of Service:** [View Here](https://meld-rx-predictive-ai-application.vercel.app/terms-of-service)

⚠ **Note**: The hosted URLs may become unavailable after the hackathon results are announced.

---

## 📌 Overview

**What is this app?**  
Predictive AI Healthcare Insighter is an AI-powered decision-support tool integrated with Electronic Health Records (EHR) via MeldRx.

**What does it do?**

- Provides **real-time patient risk predictions**.
- Suggests **AI-powered recommended actions**.
- Offers **preventive care recommendations**.
- Displays **interactive visual insights** about patient history and trends.

---

## 🔍 Features

✔️ **Secure Authentication** – Uses OAuth 2.0 authentication via MeldRx.  
✔️ **AI-Driven Insights** – Uses Gemini AI for predictive analytics.  
✔️ **Risk Score Calculation** – Determines the likelihood of disease progression.  
✔️ **Treatment Recommendations** – Provides AI-suggested treatments or preventive care actions.  
✔️ **Data Visualization** – Graphs, charts, and trends displayed via Recharts.  
✔️ **CDS Hook Integration** – Embeds within EHR, showing AI insights when patient data is accessed.  
✔️ **PDF Reports** – Generates downloadable AI analysis reports for reference.

---

## 🏗️ Technologies Used

This project is built with:

| Technology                                                                | Purpose                        |
| ------------------------------------------------------------------------- | ------------------------------ |
| [oidc-client-ts](https://github.com/authts/oidc-client-ts)                | Authentication & Authorization |
| [Redux Toolkit](https://redux-toolkit.js.org/)                            | Global State Management        |
| [React Redux](https://react-redux.js.org/)                                | State Management               |
| [Axios](https://axios-http.com/)                                          | API Requests                   |
| [Recharts](https://recharts.org/)                                         | Data Visualization             |
| [TailwindCSS](https://tailwindcss.com/) & [DaisyUI](https://daisyui.com/) | UI Styling                     |
| [Google Generative AI](https://ai.google.dev/)                            | AI-driven Predictions          |
| [React PDF Renderer](https://react-pdf.org/)                              | PDF Generation                 |

---

## 🚀 Installation & Setup

Follow these steps to set up the project locally.

### 1️⃣ Clone the Repository

```sh
git clone https://github.com/JonathanSolvesProblems/MeldRX-PredictiveAI-Application.git
cd predictive-ai-service
```

### 2️⃣ Create Environment Variables

Create a `.env.local` file in the root directory and add the following:

```sh
NEXT_PUBLIC_AUTHORITY=https://app.meldrx.com
NEXT_PUBLIC_CLIENT_ID=<meldrx client id>
NEXT_PUBLIC_CALLBACK_URL=http://localhost:3000/callback
GEMINI_API_KEY=<Google Gemini API Key>
NEXT_PUBLIC_APP_ID=<meldrx bundle id>
```

### 3️⃣ MeldRx App Setup

To integrate with **MeldRx**, follow these steps:

1. **Create an app** on [MeldRx](https://app.meldrx.com/).
2. **Set the required OAuth Scopes** for authentication:
   - `profile`
   - `openid`
   - `launch`
   - `launch/patient`
   - `patient/*.*`
   - `patient/*.read`
3. **Configure the Redirect URL:**
   - For the deployed app:
     ```sh
     https://meld-rx-predictive-ai-application.vercel.app/callback
     ```
   - For local development:
     ```sh
     http://localhost:3000/callback
     ```

### 4️⃣ CDS Hook Setup

To enable **Clinical Decision Support (CDS) Hooks**, follow these steps:

1. Navigate to your **MeldRx App Dashboard**.
2. Locate the **CDS Hooks Configuration** section.
3. Set the **CDS Hook Service URL**:

   - For the deployed app:
     ```sh
     https://meld-rx-predictive-ai-application.vercel.app/api/cds-services/0001
     ```
   - For local development:

     ```sh
     http://localhost:3000/api/cds-services/0001
     ```

     3.1. Ensure to host it with ngrok generated URL and use that as the URL to get it to work without hosting it: [ngrok](https://ngrok.com/)

4. Save the configuration and ensure your **CDS Hook is active**.
5. The CDS Hook will trigger when a patient record is opened, providing a link to the application for further analysis.

### 5️⃣ Import Sample Patients

To test the application, you can import sample patient data into MeldRx:

1. **Go to the MeldRx Dashboard** and navigate to the **Patients** section.
2. Look for the option to **Import Sample Patients** and follow the on-screen instructions.
3. Once imported, open a sample patient record within the **EHR system**.
4. The CDS Hook should trigger automatically, displaying a link to the **Predictive AI Healthcare Insighter** app.
5. Click the link to access AI-generated insights, including **risk scores, recommended actions, and data visualizations**.

✅ _At this point, the app should be fully functional within the EHR system, displaying AI-driven insights on patient data!_ 🚀

## 🌍 Online Deployment

The application is hosted on Vercel at:

👉 [MeldRx Predictive AI App](https://meld-rx-predictive-ai-application.vercel.app/)

⚠ **Note**: The hosted URL must be navigated through the MeldRx platform in order to initiate the authentication step to access the application.
