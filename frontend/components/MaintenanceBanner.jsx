"use client";
import { useEffect, useState } from "react";
import { fetchMaintenanceStatus } from "@/services/adminService";
import { useLanguage } from "@/context/LanguageContext";

export default function MaintenanceBanner() {
    const [maintenance, setMaintenance] = useState(false);
    const { t } = useLanguage();

    useEffect(() => {
        let interval;
        const check = async () => {
            try {
                const data = await fetchMaintenanceStatus();
                setMaintenance(data.maintenance);
            } catch { }
        };
        check();
        interval = setInterval(check, 5000);
        return () => clearInterval(interval);
    }, []);

    if (!maintenance) return null;

    return (
        <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            background: "#0f172a",
            color: "#e2e8f0",
            textAlign: "center",
            padding: "10px 20px",
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: "0.01em",
        }}>
            {t('maintenance.message')}
        </div>
    );
}
