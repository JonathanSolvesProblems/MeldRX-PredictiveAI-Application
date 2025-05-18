"use client";

import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { setUser, setToken, setPatientId } from "./redux/authSlice"; // Adjust path to redux slice
import { handleCallback, handleLaunch } from "../utils/auth"; // Assuming these functions are implemented
import axios from "axios";
import { SimulateLastAnalyzed } from "@/components/SimulateLastAnalyzed";
import Dashboard from "@/components/Dashboard";
import { DocumentWheel } from "@/components/DocumentWheel";
// import AnalyzeDocumentsButton from "@/components/AnalyzeDocumentsButton";
// import { DocumentWheel } from "@/components/DocumentWheel";
// import Dashboard from "@/components/Dashboard";

export default function Home() {
  const dispatch = useDispatch();
  const user = useSelector((state: any) => state.auth.user);
  const token = useSelector((state: any) => state.auth.token);
  const patientId = useSelector((state: any) => state.auth.patientId);
  const [loading, setLoading] = useState(true); // State to handle loading state
  const [patientName, setPatientName] = useState<string | null>(null);

  useEffect(() => {
    // console.log("Redux User:", user);
    // console.log("Redux Token:", token);
    // console.log("Redux Patient ID:", patientId);
  }, [user, token, patientId]);

  useEffect(() => {
    const authenticateUser = async () => {
      try {
        if (window.location.pathname === "/callback") {
          // console.log("Handling authentication callback...");
          const userData = await handleCallback();
          if (userData && userData.user && userData.token) {
            dispatch(setUser(userData.user));
            dispatch(setToken(userData.token));
            dispatch(setPatientId(userData.patientId || null)); // Store patientId
            // console.log("User authenticated:", userData.user);
          }
        } else if (window.location.pathname === "/launch") {
          // console.log("Handling SMART launch...");
          const userData = await handleLaunch();
          if (userData && userData.user && userData.token) {
            dispatch(setUser(userData.user));
            dispatch(setToken(userData.token));
            dispatch(setPatientId(userData.patientId || null)); // Store patientId
            // console.log("Launch successful:", userData.user);
          }
        }
      } catch (error) {
        console.error("Authentication error:", error);
      } finally {
        setLoading(false);
      }
    };

    authenticateUser();
  }, [dispatch]);

  useEffect(() => {
    if (patientId && token) {
      const fetchPatientName = async () => {
        try {
          const response = await axios.get(
            `https://app.meldrx.com/api/fhir/23cd739c-3141-4d1a-81a3-697b766ccb56/Patient/${patientId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          const patientName = response.data.name[0];
          const fullName = `${patientName.given.join(" ")} ${
            patientName.family
          }`;
          setPatientName(fullName); // Set patient name state
        } catch (error) {
          console.error("Error fetching patient name:", error);
        }
      };

      fetchPatientName();
    }
  }, [patientId, token]);

  return (
    <main className="min-h-screen bg-base-100 p-6">
      {/* <AnalyzeDocumentsButton /> */}
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold text-blue-700">
          Welcome to the Predictive AI Healthcare App
        </h1>
      </header>

      <div className="p-4">
        <h1 className="text-xl font-bold mb-4">Patient Documents</h1>
        <DocumentWheel />
      </div>

      {loading ? (
        <div className="flex justify-center items-center">
          <div className="loader loader-spinner"></div>
          <p className="ml-4 text-lg">Authenticating...</p>
        </div>
      ) : user && token ? (
        <>
          {patientName ? (
            <h2 className="text-4xl font-bold text-center text-indigo-600 mt-10">
              {patientName}'s Insights
            </h2>
          ) : (
            <p className="text-center text-xl">Loading Patient Name...</p>
          )}

          <SimulateLastAnalyzed />
          {/* <DebugData /> */}
          <Dashboard />
          {/* <DashboardBackup /> */}
        </>
      ) : (
        <p className="text-center text-xl text-red-500">Not authenticated</p>
      )}
    </main>
  );
}
