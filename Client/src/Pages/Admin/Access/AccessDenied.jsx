import React from 'react';
import AdminSideBar from '../../../Layouts/AdminLayouts/AdminSideBar';
import { ShieldSlash, ArrowLeft } from 'phosphor-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import './AccessDenied.css';
import SEO from '../../../Utils/SEO';

export default function AccessDenied() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <>
      <SEO title={"Access Denied"}
        description={"You don't have permission to access this page."}
         noIndex={true}
     />

      <AdminSideBar />
      <div className="main-layout admin-layout">
        <div className="margin-container"></div>
        <div style={{ width: "100%" }}>
          <div className="access-denied-container">
            <div className="access-denied-content">
              <ShieldSlash size={120} weight="duotone" className="access-denied-icon" />
              <h1>{t("Access Denied")}</h1>
              <p className="access-denied-message">
                {t("You don't have permission to access this page.")}
              </p>
              <p className="access-denied-submessage">
                {t("Please contact a super admin if you believe this is an error.")}
              </p>
              <button className="back-button" onClick={() => navigate('/admin/dashboard')}>
                <ArrowLeft size={20} weight="bold" />
                {t("Back to Dashboard")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}