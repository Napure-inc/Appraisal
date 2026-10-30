document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector(".assessment-form");
  if (!form) return;

  let isSubmitting = false;
  let allowNavigation = false;
  let isDirty = false;

  const isMobile =
    window.matchMedia("(pointer: coarse)").matches || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const fields = form.querySelectorAll("input, select, textarea");
  const links = document.querySelectorAll("a");

  function checkDirty() {
    isDirty = Array.from(fields).some((field) => {
      if (field.type === "checkbox" || field.type === "radio") {
        return field.checked;
      }
      if (field.type === "hidden" || field.disabled) {
        return false;
      }
      return field.value && field.value.trim() !== "";
    });
  }

  // スマホだけ「入力済み」を判定
  if (isMobile) {
    fields.forEach((field) => {
      field.addEventListener("input", checkDirty);
      field.addEventListener("change", checkDirty);
    });
  }

  // 送信時は警告を出さない
  form.addEventListener("submit", () => {
    isSubmitting = true;
    allowNavigation = true;
  });

  // =========================
  // PC版：今の仕様をそのまま維持
  // =========================
  if (!isMobile) {
    window.addEventListener("beforeunload", function (e) {
      if (isSubmitting || allowNavigation) return;

      e.preventDefault();
      e.returnValue = "";
    });
    return;
  }

  // =========================
  // スマホ版：入力後だけリンク遷移時に確認
  // =========================
  links.forEach((link) => {
    link.addEventListener("click", function (e) {
      const href = link.getAttribute("href");

      if (!href) return;
      if (href.startsWith("#")) return;
      if (link.hasAttribute("target")) return;
      if (isSubmitting || allowNavigation || !isDirty) return;

      const ok = confirm("入力内容が失われる可能性があります。このページを離れますか？");

      if (!ok) {
        e.preventDefault();
      } else {
        allowNavigation = true;
      }
    });
  });

  // =========================
  // スマホ版：入力後だけ戻る操作時に確認
  // =========================
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
});

document.addEventListener("DOMContentLoaded", function () {
  const selectedPropertyType = sessionStorage.getItem("selectedPropertyType") || "";
  const selectedPrefecture = sessionStorage.getItem("selectedPrefecture") || "";
  const selectedCity = sessionStorage.getItem("selectedCity") || "";
  const selectedTown = sessionStorage.getItem("selectedTown") || "";

  // 物件種別（radio）反映
  if (selectedPropertyType) {
    const targetRadio = document.querySelector('input[name="property_type"][value="' + selectedPropertyType + '"]');
    if (targetRadio) targetRadio.checked = true;
  }

  // 都道府県
  const prefectureSelect = document.getElementById("prefecture");
  if (prefectureSelect && selectedPrefecture) {
    let exists = Array.from(prefectureSelect.options).some((option) => option.value === selectedPrefecture);

    if (!exists) {
      const option = document.createElement("option");
      option.value = selectedPrefecture;
      option.textContent = selectedPrefecture;
      prefectureSelect.appendChild(option);
    }

    prefectureSelect.value = selectedPrefecture;
  }

  // 市区町村
  const citySelect = document.getElementById("city");
  if (citySelect && selectedCity) {
    let exists = Array.from(citySelect.options).some((option) => option.value === selectedCity);

    if (!exists) {
      const option = document.createElement("option");
      option.value = selectedCity;
      option.textContent = selectedCity;
      citySelect.appendChild(option);
    }

    citySelect.value = selectedCity;
  }

  // 町名
  const townSelect = document.getElementById("town");
  if (townSelect && selectedTown) {
    let exists = Array.from(townSelect.options).some((option) => option.value === selectedTown);

    if (!exists) {
      const option = document.createElement("option");
      option.value = selectedTown;
      option.textContent = selectedTown;
      townSelect.appendChild(option);
    }

    townSelect.value = selectedTown;
  }
});
