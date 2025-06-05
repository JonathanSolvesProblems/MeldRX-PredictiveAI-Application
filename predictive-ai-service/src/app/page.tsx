"use client";

import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { setUser, setToken, setPatientId } from "./redux/authSlice";
import { handleCallback, handleLaunch } from "../utils/auth";
import axios from "axios";
import { DocumentWheel } from "@/components/DocumentWheel";
import AICentralAnalyzer from "@/components/AICentralAnalyzer";
import { QuestionUploader } from "@/components/QuestionUploader";
import Dashboards from "@/components/Dashboards";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, FileText, LayoutDashboard, UserCircle } from "lucide-react";
import type { RootState } from "@/app/redux/store";

export default function Home() {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  const patientId = useSelector((state: RootState) => state.auth.patientId);

  const [loading, setLoading] = useState(true);
  const [patientName, setPatientName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "aianalyzer" | "documents" | "dashboards"
  >("aianalyzer");

  useEffect(() => {
    const authenticateUser = async () => {
      try {
        if (window.location.pathname === "/callback") {
          const userData = await handleCallback();
          if (userData?.user && userData?.token) {
            dispatch(setUser(userData.user));
            dispatch(setToken(userData.token));
            dispatch(setPatientId(userData.patientId ?? null));
          }
        } else if (window.location.pathname === "/launch") {
          const userData = await handleLaunch();
          if (userData?.user && userData?.token) {
            dispatch(setUser(userData.user));
            dispatch(setToken(userData.token));
            dispatch(setPatientId(userData.patientId ?? null));
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
    if (!patientId || !token) return;

    (async () => {
      try {
        const res = await axios.get(`/api/patient/${patientId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const nameObj = res.data.name?.[0];
        if (nameObj) {
          const full = `${nameObj.given.join(" ")} ${nameObj.family}`;
          setPatientName(full);
        }
      } catch (e) {
        console.error("Error fetching patient name", e);
      }
    })();
  }, [patientId, token]);

  const TABS = [
    { id: "aianalyzer" as const, label: "Overview", icon: Sparkles },
    { id: "documents" as const, label: "Documents", icon: FileText },
    { id: "dashboards" as const, label: "Dashboards", icon: LayoutDashboard },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-base-100 via-base-200 to-base-300 p-4 md:p-8">
      <header className="hero bg-gradient-to-r from-primary via-secondary to-accent text-primary-content rounded-3xl shadow-xl overflow-hidden mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="hero-content flex-col lg:flex-row gap-6"
        >
          <UserCircle className="w-20 h-20 opacity-80" />
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold drop-shadow-lg">
              Predictive&nbsp;AI&nbsp;Healthcare
            </h1>
            <p className="pt-2 md:pt-3 text-base md:text-lg opacity-90">
              Personalized insights for {patientName ?? "your"} health journey
            </p>
          </div>
        </motion.div>
      </header>

      <div className="flex justify-center mb-6">
        <nav
          role="tablist"
          className="tabs tabs-boxed bg-base-200 shadow-lg rounded-2xl max-w-fit"
        >
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              onClick={() => setActiveTab(id)}
              className={`tab gap-2 transition-transform duration-200 focus-visible:outline-none ${
                activeTab === id ? "tab-active scale-105" : "hover:scale-105"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-4 mt-20">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="font-medium">Authenticating…</p>
        </div>
      ) : user && token ? (
        <>
          {/* Patient Banner + Uploader */}
          <AnimatePresence mode="wait">
            {patientName ? (
              <motion.div
                key="patientBanner"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="glass bg-base-100/60 border border-base-content/10 rounded-2xl shadow-md p-6 mb-6 text-center backdrop-blur-md"
              >
                <h2 className="text-3xl md:text-4xl font-bold text-secondary">
                  {patientName}&apos;s Insights
                </h2>
                <div className="flex justify-center mt-4">
                  <QuestionUploader />
                </div>
              </motion.div>
            ) : (
              <motion.p
                key="loadingName"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center text-xl mb-4"
              >
                Loading Patient Name…
              </motion.p>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {activeTab === "aianalyzer" && (
              <motion.section
                key="aiTab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >
                <AICentralAnalyzer />
              </motion.section>
            )}

            {activeTab === "documents" && (
              <motion.section
                key="docsTab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="p-4 md:p-6 card shadow-xl bg-base-100/70 backdrop-blur-md"
              >
                <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" /> Patient Documents
                </h1>
                <DocumentWheel />
              </motion.section>
            )}

            {activeTab === "dashboards" && (
              <motion.section
                key="dashTab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="p-4 md:p-6 card shadow-xl bg-base-100/70 backdrop-blur-md"
              >
                <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <LayoutDashboard className="w-5 h-5" /> Dashboards
                </h1>
                <Dashboards />
              </motion.section>
            )}
          </AnimatePresence>
        </>
      ) : (
        <div className="text-center mt-20 space-y-4">
          <p className="text-xl text-error font-semibold">Not authenticated</p>
          <button
            onClick={() => (window.location.href = "/launch")}
            className="btn btn-primary btn-wide"
          >
            Launch SMART App
          </button>
        </div>
      )}
    </main>
  );
}
