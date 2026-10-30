document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector(".assessment-form");
  if (!form) return;

  const STEP1_STORAGE_KEY = "assessment_step1_data";
  const STEP2_STORAGE_KEY = "assessment_step2_data";

  let isSubmitting = false;
  let allowNavigation = false;
  let isDirty = false;

  const isMobile =
    window.matchMedia("(pointer: coarse)").matches || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const fields = form.querySelectorAll("input, select, textarea");
  const links = document.querySelectorAll("a[href]:not([target='_blank'])");

  // メールで表示したい日本語ラベル
  const labelMap = {
    name: "氏名",
    kana: "フリガナ",
    birthday: "生年月日",
    email: "メールアドレス",
    tel: "電話番号",
    zip: "郵便番号",
    pref: "都道府県",
    city: "市区町村",
    address: "住所",

    property_type: "物件種別",
    property_prefecture: "都道府県（物件）",
    property_city: "市区町村（物件）",
    property_town: "町名（物件）",
    property_address: "住所（物件）",

    living_status: "住まいの状況",
    land_area: "土地面積",
    building_area: "建物面積",
    layout: "間取り",
    building_age: "築年数",
    relation: "物件との関連性",
    timing: "売却希望時期",
    reason: "依頼理由",
    request: "ご要望"
  };

  function checkDirty() {
    isDirty = Array.from(form.querySelectorAll("input, select, textarea")).some((field) => {
      if (field.type === "checkbox" || field.type === "radio") {
        return field.checked;
      }
      if (field.type === "hidden" || field.type === "submit" || field.type === "button" || field.disabled) {
        return false;
      }
      return field.value && field.value.trim() !== "";
    });
  }

  function collectFormData(targetForm, options = {}) {
    const { excludeHidden = true } = options;
    const data = {};
    const elements = targetForm.querySelectorAll("input, select, textarea");

    elements.forEach((el) => {
      if (!el.name || el.disabled) return;

      const type = (el.type || "").toLowerCase();

      if (type === "submit" || type === "button" || type === "file") return;
      if (excludeHidden && type === "hidden") return;

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

  function getStep1Data() {
    const raw = sessionStorage.getItem(STEP1_STORAGE_KEY);
    if (!raw) return {};

    try {
      return JSON.parse(raw) || {};
    } catch (e) {
      return {};
    }
  }

  function getStep2Data() {
    const raw = sessionStorage.getItem(STEP2_STORAGE_KEY);
    if (!raw) return {};

    try {
      return JSON.parse(raw) || {};
    } catch (e) {
      return {};
    }
  }

  function saveStep2Data() {
    const step2Data = collectFormData(form);
    sessionStorage.setItem(STEP2_STORAGE_KEY, JSON.stringify(step2Data));
  }

  function restoreStep2Data() {
    const step2Data = getStep2Data();

    Object.keys(step2Data).forEach((name) => {
      const value = step2Data[name];
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

  function appendHidden(name, value) {
    const hidden = document.createElement("input");
    hidden.type = "hidden";
    hidden.name = name;
    hidden.value = value ?? "";
    hidden.setAttribute("data-generated-hidden", "true");
    form.appendChild(hidden);
  }

  function removeGeneratedHiddenFields() {
    form.querySelectorAll('input[data-generated-hidden="true"]').forEach((el) => {
      el.remove();
    });
  }

  function injectJapaneseLabeledFields() {
    removeGeneratedHiddenFields();

    // STEP1の保存データ
    const step1Data = getStep1Data();

    Object.keys(step1Data).forEach((name) => {
      const value = step1Data[name];
      const label = labelMap[name] || name;

      if (Array.isArray(value)) {
        value.forEach((item) => appendHidden(label, item));
      } else {
        appendHidden(label, value);
      }
    });

    // STEP2の現在入力中データ
    const step2Data = collectFormData(form);

    Object.keys(step2Data).forEach((name) => {
      const value = step2Data[name];
      const label = labelMap[name] || name;

      if (Array.isArray(value)) {
        value.forEach((item) => appendHidden(label, item));
      } else {
        appendHidden(label, value);
      }
    });
  }

  function disableOriginalNamedFieldsForSubmit() {
    form.querySelectorAll("input, select, textarea").forEach((el) => {
      const type = (el.type || "").toLowerCase();

      if (!el.name) return;
      if (type === "hidden" || type === "submit" || type === "button") return;

      el.disabled = true;
    });
  }

  restoreStep2Data();
  checkDirty();

  if (isMobile) {
    fields.forEach((field) => {
      field.addEventListener("input", checkDirty);
      field.addEventListener("change", checkDirty);
    });
  }

  fields.forEach((field) => {
    field.addEventListener("change", function () {
      saveStep2Data();
      checkDirty();
    });

    field.addEventListener("input", function () {
      const type = (field.type || "").toLowerCase();
      if (type !== "radio" && type !== "checkbox") {
        saveStep2Data();
      }
      checkDirty();
    });
  });

  form.addEventListener("submit", function () {
    // STEP2の最新状態を保存
    saveStep2Data();

    // 日本語ラベルのhiddenを生成
    injectJapaneseLabeledFields();

    // 英語キーの元フィールドは送信しない
    disableOriginalNamedFieldsForSubmit();

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
