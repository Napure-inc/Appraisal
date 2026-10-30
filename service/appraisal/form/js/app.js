document.addEventListener("DOMContentLoaded", async function () {
  const form = document.querySelector(".assessment-form");
  if (!form) return;

  const STORAGE_KEY = "assessment_step1_data";
  const API_BASE = "https://japanese-addresses-v2.geoloniamaps.com/api/ja";

  let isSubmitting = false;
  let allowNavigation = false;
  let isDirty = false;

  const isMobile =
    window.matchMedia("(pointer: coarse)").matches || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const links = document.querySelectorAll("a[href]:not([target='_blank'])");

  const prefectureSelect = form.querySelector(".js-prefecture");
  const citySelect = form.querySelector(".js-city");
  const townSelect = form.querySelector(".js-town");

  if (!prefectureSelect || !citySelect || !townSelect) return;

  function getFields() {
    return form.querySelectorAll("input, select, textarea");
  }

  function checkDirty() {
    isDirty = Array.from(getFields()).some((field) => {
      if (field.type === "checkbox" || field.type === "radio") {
        return field.checked;
      }
      if (field.type === "hidden" || field.type === "submit" || field.type === "button" || field.disabled) {
        return false;
      }
      return field.value && field.value.trim() !== "";
    });
  }

  function collectFormData(targetForm) {
    const data = {};
    const elements = targetForm.querySelectorAll("input, select, textarea");

    elements.forEach((el) => {
      if (!el.name || el.disabled) return;

      const type = (el.type || "").toLowerCase();

      if (type === "submit" || type === "button" || type === "file") return;

      if (type === "radio") {
        if (el.checked) {
          data[el.name] = el.value;
        } else if (!(el.name in data)) {
          data[el.name] = "";
        }
        return;
      }

      if (type === "checkbox") {
        if (!data[el.name]) data[el.name] = [];
        if (el.checked) {
          data[el.name].push(el.value);
        }
        return;
      }

      data[el.name] = el.value;
    });

    return data;
  }

  function saveStep1Data() {
    const data = collectFormData(form);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function getSavedStep1Data() {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    try {
      return JSON.parse(raw) || {};
    } catch (e) {
      return {};
    }
  }

  function restoreNonAddressFields() {
    const savedData = getSavedStep1Data();

    Object.keys(savedData).forEach((name) => {
      if (name === "property_prefecture" || name === "property_city" || name === "property_town") {
        return;
      }

      const value = savedData[name];
      const elements = form.querySelectorAll(`[name="${CSS.escape(name)}"]`);
      if (!elements.length) return;

      elements.forEach((el) => {
        const type = (el.type || "").toLowerCase();

        if (type === "radio") {
          el.checked = el.value === value;
          return;
        }

        if (type === "checkbox") {
          const values = Array.isArray(value) ? value : [value];
          el.checked = values.includes(el.value);
          return;
        }

        el.value = value ?? "";
      });
    });
  }

  function setRadioValue(name, value) {
    if (!value) return;
    const radios = form.querySelectorAll(`input[name="${CSS.escape(name)}"]`);
    radios.forEach((radio) => {
      radio.checked = radio.value === value;
    });
  }

  const resetSelect = (select, placeholder) => {
    select.innerHTML = `<option value="">${placeholder}</option>`;
    select.disabled = true;
  };

  const addOption = (select, value, text) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    select.appendChild(option);
  };

  const getCityLabel = (cityObj) => `${cityObj.city || ""}${cityObj.ward || ""}`;
  const getTownLabel = (townObj) => `${townObj.oaza_cho || ""}${townObj.chome || ""}`;

  let prefectureData = [];

  async function loadPrefectures() {
    const prefRes = await fetch(`${API_BASE}.json`, { cache: "no-store" });
    if (!prefRes.ok) throw new Error("都道府県データの取得に失敗しました。");

    const prefJson = await prefRes.json();
    if (!prefJson.data || !Array.isArray(prefJson.data)) {
      throw new Error("都道府県データの形式が不正です。");
    }

    prefectureData = prefJson.data;

    prefectureSelect.innerHTML = `<option value="">都道府県を入力してください</option>`;
    prefectureData.forEach((prefObj) => {
      addOption(prefectureSelect, prefObj.pref, prefObj.pref);
    });

    resetSelect(citySelect, "市区町村を入力してください");
    resetSelect(townSelect, "町名を入力してください");
  }

  function fillCities(selectedPref) {
    resetSelect(citySelect, "市区町村を入力してください");
    resetSelect(townSelect, "町名を入力してください");

    if (!selectedPref) return;

    const prefObj = prefectureData.find((item) => item.pref === selectedPref);
    if (!prefObj || !Array.isArray(prefObj.cities)) return;

    const seen = new Set();

    prefObj.cities.forEach((cityObj) => {
      const label = getCityLabel(cityObj);
      if (!label || seen.has(label)) return;
      seen.add(label);
      addOption(citySelect, label, label);
    });

    citySelect.disabled = false;
  }

  async function fillTowns(selectedPref, selectedCity) {
    resetSelect(townSelect, "町名を入力してください");

    if (!selectedPref || !selectedCity) return;

    try {
      const cityUrl = `${API_BASE}/${encodeURIComponent(selectedPref)}/${encodeURIComponent(selectedCity)}.json`;
      const townRes = await fetch(cityUrl, { cache: "no-store" });
      if (!townRes.ok) throw new Error("地区データ取得失敗");

      const townJson = await townRes.json();
      if (!townJson.data || !Array.isArray(townJson.data)) return;

      const seen = new Set();

      townJson.data.forEach((townObj) => {
        const label = getTownLabel(townObj);
        if (!label || seen.has(label)) return;
        seen.add(label);
        addOption(townSelect, label, label);
      });

      townSelect.disabled = false;
    } catch (error) {
      console.error("町丁目取得エラー:", error);
    }
  }

  try {
    await loadPrefectures();
  } catch (error) {
    console.error("都道府県取得エラー:", error);
    return;
  }

  restoreNonAddressFields();

  const selectedPropertyType = sessionStorage.getItem("selectedPropertyType") || "";
  const selectedPrefecture = sessionStorage.getItem("selectedPrefecture") || "";
  const selectedCity = sessionStorage.getItem("selectedCity") || "";
  const selectedTown = sessionStorage.getItem("selectedTown") || "";

  const savedStep1 = getSavedStep1Data();

  // メインページの選択値を最優先
  const initialPropertyType = selectedPropertyType || savedStep1.property_type || "";
  const initialPrefecture = selectedPrefecture || savedStep1.property_prefecture || "";
  const initialCity = selectedCity || savedStep1.property_city || "";
  const initialTown = selectedTown || savedStep1.property_town || "";

  setRadioValue("property_type", initialPropertyType);

  if (initialPrefecture) {
    prefectureSelect.value = initialPrefecture;
    fillCities(initialPrefecture);
  }

  if (initialPrefecture && initialCity) {
    citySelect.value = initialCity;
    await fillTowns(initialPrefecture, initialCity);
  }

  if (initialPrefecture && initialCity && initialTown) {
    townSelect.value = initialTown;
  }

  checkDirty();

  prefectureSelect.addEventListener("change", function () {
    fillCities(prefectureSelect.value);
    saveStep1Data();
    checkDirty();
  });

  citySelect.addEventListener("change", async function () {
    await fillTowns(prefectureSelect.value, citySelect.value);
    saveStep1Data();
    checkDirty();
  });

  townSelect.addEventListener("change", function () {
    saveStep1Data();
    checkDirty();
  });

  getFields().forEach((field) => {
    field.addEventListener("change", function () {
      saveStep1Data();
      checkDirty();
    });

    field.addEventListener("input", function () {
      const type = (field.type || "").toLowerCase();
      if (type !== "radio" && type !== "checkbox") {
        saveStep1Data();
      }
      checkDirty();
    });
  });

  form.addEventListener("submit", function () {
    saveStep1Data();

    const propertyType = form.querySelector('input[name="property_type"]:checked')?.value || "";
    const prefValue = prefectureSelect.value || "";
    const cityValue = citySelect.value || "";
    const townValue = townSelect.value || "";

    sessionStorage.setItem("selectedPropertyType", propertyType);
    sessionStorage.setItem("selectedPrefecture", prefValue);
    sessionStorage.setItem("selectedCity", cityValue);
    sessionStorage.setItem("selectedTown", townValue);

    isSubmitting = true;
    allowNavigation = true;
  });

  if (!isMobile) {
    window.addEventListener("beforeunload", function (e) {
      if (isSubmitting || allowNavigation) return;
      e.preventDefault();
      e.returnValue = "";
    });
  } else {
    links.forEach((link) => {
      link.addEventListener("click", function (e) {
        const href = link.getAttribute("href");
        if (!href) return;
        if (href.startsWith("#")) return;
        if (isSubmitting || allowNavigation || !isDirty) return;

        const ok = confirm("入力内容が失われる可能性があります。このページを離れますか？");
        if (!ok) {
          e.preventDefault();
        } else {
          allowNavigation = true;
        }
      });
    });

    history.pushState({ guard: true }, "", location.href);

    window.addEventListener("popstate", function () {
      if (isSubmitting || allowNavigation || !isDirty) return;

      const ok = confirm("入力内容が失われる可能性があります。このページを離れますか？");
      if (!ok) {
        history.pushState({ guard: true }, "", location.href);
      } else {
        allowNavigation = true;
        history.back();
      }
    });
  }
});
