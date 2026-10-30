// TOPボタン
$(document).ready(function () {
  // スクロールイベントを監視
  $(window).scroll(function () {
    if ($(this).scrollTop() > 200) {
      $("#page_top").fadeIn();
    } else {
      $("#page_top").fadeOut();
    }
  });

  // ボタンをクリックしてページトップに戻る処理
  $("#page_top").click(function (e) {
    e.preventDefault();
    $("html, body").animate({ scrollTop: 0 }, 500);
  });
});

// 選択フォーム
document.querySelectorAll("[data-select]").forEach((select) => {
  const trigger = select.querySelector("[data-trigger]");
  const value = select.querySelector("[data-value]");
  const options = select.querySelectorAll("[data-option]");

  if (!trigger || !value || !options.length) return;

  // トリガークリックで開閉
  trigger.addEventListener("click", (e) => {
    e.stopPropagation();

    const isOpen = select.classList.contains("is-open");

    // 他を閉じる
    document.querySelectorAll("[data-select]").forEach((item) => {
      if (item !== select) {
        item.classList.remove("is-open");
      }
    });

    // 自分を開閉
    select.classList.toggle("is-open", !isOpen);
  });

  // オプション選択
  options.forEach((option) => {
    option.addEventListener("mousedown", (e) => {
      e.preventDefault();
    });

    option.addEventListener("click", (e) => {
      e.stopPropagation();

      options.forEach((item) => item.classList.remove("is-active"));
      option.classList.add("is-active");

      value.textContent = option.dataset.option || option.textContent.trim();

      select.classList.remove("is-open");
    });
  });
});

// 外側クリックで閉じる
document.addEventListener("click", (e) => {
  document.querySelectorAll("[data-select]").forEach((select) => {
    if (!select.contains(e.target)) {
      select.classList.remove("is-open");
    }
  });
});

// FAQセクション
document.querySelectorAll(".faq-item").forEach((item) => {
  const button = item.querySelector(".faq-question");
  const answer = item.querySelector(".faq-answer");

  if (!button || !answer) return;

  if (item.classList.contains("is-open")) {
    answer.style.height = answer.scrollHeight + "px";
  } else {
    answer.style.height = "0px";
  }

  button.addEventListener("click", () => {
    const isOpen = item.classList.contains("is-open");

    if (isOpen) {
      answer.style.height = answer.scrollHeight + "px";

      requestAnimationFrame(() => {
        answer.style.height = "0px";
      });

      item.classList.remove("is-open");
    } else {
      item.classList.add("is-open");
      answer.style.height = "0px";

      requestAnimationFrame(() => {
        answer.style.height = answer.scrollHeight + "px";
      });
    }
  });

  answer.addEventListener("transitionend", () => {
    if (item.classList.contains("is-open")) {
      answer.style.height = "auto";
    }
  });
});

gsap.to(".town_parallax", {
  x: -60,
  duration: 14,
  ease: "sine.inOut",
  repeat: -1,
  yoyo: true
});

// 都道府県
document.addEventListener("DOMContentLoaded", async function () {
  const API_BASE = "https://japanese-addresses-v2.geoloniamaps.com/api/ja";

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

  try {
    const prefRes = await fetch(`${API_BASE}.json`, {
      cache: "no-store"
    });

    if (!prefRes.ok) {
      throw new Error("都道府県データの取得に失敗しました。");
    }

    const prefJson = await prefRes.json();

    if (!prefJson.data || !Array.isArray(prefJson.data)) {
      throw new Error("都道府県データの形式が不正です。");
    }

    prefectureData = prefJson.data;
  } catch (error) {
    console.error("都道府県取得エラー:", error);
    return;
  }

  const estimateSections = document.querySelectorAll(".estimate-section");

  estimateSections.forEach((section) => {
    const formBlock = section.querySelector(".estimate-form");

    const ctaArea = section.nextElementSibling;

    const ctaButton = ctaArea && ctaArea.classList.contains("cta-area") ? ctaArea.querySelector(".js-goToForm") : null;

    if (!formBlock) return;

    const propertyTypeSelect = formBlock.querySelector(".js-propertyType");

    const prefectureSelect = formBlock.querySelector(".js-prefecture");

    const citySelect = formBlock.querySelector(".js-city");

    const townSelect = formBlock.querySelector(".js-town");

    if (!propertyTypeSelect || !prefectureSelect || !citySelect || !townSelect) {
      return;
    }

    prefectureSelect.innerHTML = `<option value="">都道府県を選択</option>`;

    prefectureData.forEach((prefObj) => {
      addOption(prefectureSelect, prefObj.pref, prefObj.pref);
    });

    resetSelect(citySelect, "市区町村を選択");
    resetSelect(townSelect, "地区名・丁目を選択");

    // 都道府県変更
    prefectureSelect.addEventListener("change", function () {
      const selectedPref = prefectureSelect.value;

      resetSelect(citySelect, "市区町村を選択");
      resetSelect(townSelect, "地区名・丁目を選択");

      if (!selectedPref) return;

      const prefObj = prefectureData.find((item) => item.pref === selectedPref);

      if (!prefObj || !Array.isArray(prefObj.cities)) {
        return;
      }

      const seen = new Set();

      prefObj.cities.forEach((cityObj) => {
        const label = getCityLabel(cityObj);

        if (!label || seen.has(label)) return;

        seen.add(label);

        addOption(citySelect, label, label);
      });

      citySelect.disabled = false;
    });

    // 市区町村変更
    citySelect.addEventListener("change", async function () {
      const selectedPref = prefectureSelect.value;
      const selectedCity = citySelect.value;

      resetSelect(townSelect, "地区名・丁目を選択");

      if (!selectedPref || !selectedCity) return;

      try {
        const cityUrl = `${API_BASE}/${encodeURIComponent(selectedPref)}/${encodeURIComponent(selectedCity)}.json`;

        const townRes = await fetch(cityUrl, {
          cache: "no-store"
        });

        if (!townRes.ok) {
          throw new Error("地区データ取得失敗");
        }

        const townJson = await townRes.json();

        if (!townJson.data || !Array.isArray(townJson.data)) {
          return;
        }

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
    });

    // 次ページへ
    if (ctaButton) {
      ctaButton.addEventListener("click", function (e) {
        e.preventDefault();

        const propertyTypeValue = propertyTypeSelect.value;

        const prefValue = prefectureSelect.value;

        const cityValue = citySelect.value;

        const townValue = townSelect.value;

        // 未入力でも保存して遷移
        sessionStorage.setItem("selectedPropertyType", propertyTypeValue);

        sessionStorage.setItem("selectedPrefecture", prefValue);

        sessionStorage.setItem("selectedCity", cityValue);

        sessionStorage.setItem("selectedTown", townValue);

        // ページ遷移
        window.location.href = "/service/appraisal/form/index.html";
      });
    }
  });
});
