import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

export default function BirthdayModal({ toggleModal, token, success }) {
  const { t } = useTranslation();
  const [error, setError] = useState(null);
  const [birthdaySuccess, setBirthdaySuccess] = useState(null);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [buttonDisability, setButtonDisability] = useState(true);
  const [complet, setComplet] = useState(success);

  let MessageContent;

  if (complet) {
    MessageContent = <span style={{ color: "darkGreen" }}>{complet}</span>;
  } else if (birthdaySuccess) {
    MessageContent = (
      <span style={{ color: "darkGreen" }}>{birthdaySuccess}</span>
    );
  } else if (error) {
    MessageContent = <span style={{ color: "darkRed" }}>{error}</span>;
  } else {
    MessageContent = (
      <span className="info">
        {t("shareYourBirthday")}
      </span>
    );
  }
  useEffect(() => {
    if (selectedYear && selectedMonth && selectedDay) {
      const birthDate = new Date(selectedYear, selectedMonth - 1, selectedDay);
      const today = new Date();
      const age =
        today.getFullYear() -
        birthDate.getFullYear() -
        (today.getMonth() < birthDate.getMonth() ||
        (today.getMonth() === birthDate.getMonth() &&
          today.getDate() < birthDate.getDate())
          ? 1
          : 0);

      setButtonDisability(age < 13);
    } else {
      setButtonDisability(true);
    }
  }, [selectedYear, selectedMonth, selectedDay]);

  const showDaySelect = selectedYear !== "" && selectedMonth !== "";
  const showMonthSelect = selectedYear !== "";

  const months = [
    t("january"),
    t("february"),
    t("march"),
    t("april"),
    t("may"),
    t("june"),
    t("july"),
    t("august"),
    t("september"),
    t("october"),
    t("november"),
    t("december"),
  ];

  const today = new Date();
  const currentMonth = today.getMonth(); 
  const currentDay = today.getDate();

  const currentYear = new Date().getFullYear();
  const maxYear = currentYear - 13;
  const startYear = 1920;

  const years = Array.from(
    { length: maxYear - startYear + 1 },
    (_, i) => startYear + i
  ).reverse();

  const getDaysInMonth = (monthIndex, year) => {
    if (!year || monthIndex === "") return 31;
    return new Date(year, monthIndex + 1, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(
    selectedMonth - 1,
    selectedYear
  );

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const AddBirthdayApi = async (e) => {
    e.preventDefault();
    const birthdayDate = new Date(selectedYear, selectedMonth - 1, selectedDay);
    const birthDay = birthdayDate.toISOString();
    try {
      const response = await fetch(`${import.meta.env.VITE_API}/add-birthday`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ birthDay, token }),
      });

      const data = await response.json();

      if (response.ok) {
        toggleModal("profile", token);
        setBirthdaySuccess(data.message);
      } else {
        setError(data.error);
        setBirthdaySuccess(null);
      }
    } catch (err) {
      setError(t("somethingWentWrong"));
      console.error(err.message);
    }
  };
  return (
    <form className="nasted-modal" onSubmit={AddBirthdayApi}>
      <h1 style={{ marginTop: "20px" }}>{t("addBirthday")}</h1>
      <p style={{ marginTop: "10px" }}>{MessageContent}</p>

      <div className="date-div">
        <select
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value)}
          className="date-select secondary-button"
          disabled={!showDaySelect}
        >
          {" "}
          <option value="" disabled>
            {t("day")}
          </option>
          {showDaySelect &&
            days.map((day) => {
              const isDisabled =
                selectedYear === maxYear &&
                selectedMonth - 1 === currentMonth &&
                day > currentDay;

              return (
                <option key={day} value={day} disabled={isDisabled}>
                  {day}
                </option>
              );
            })}
        </select>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="date-select  secondary-button"
          disabled={!showMonthSelect}
        >
          <option value="" disabled>
            {t("month")}
          </option>
          {months.map((month, index) => {
            const isDisabled = selectedYear === maxYear && index > currentMonth;
            return (
              <option key={index} value={index + 1} disabled={isDisabled}>
                {month}
              </option>
            );
          })}
        </select>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className=" date-select  secondary-button"
        >
          <option value="" disabled>
            {t("year")}
          </option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      <p
        className="birthday-text"
        style={{ marginTop: "30px", marginBottom: "15px" }}
      >
        {t("mustBeAtLeast13")}
      </p>
      <button className="main-button" disabled={buttonDisability}>
        {t("save")}
      </button>
    </form>
  );
}
