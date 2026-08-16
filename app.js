(function () {
  "use strict";

  const data = window.NUTRYFIT_DATA;
  const mealPlans = window.NUTRYFIT_PLANS;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const formatMoney = (value) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(value);

  const state = {
    selectedCategory: null,
    search: "",
    lightboxIndex: 0,
    cart: loadCart(),
    builder: createBuilderState(),
    selectedPlan: null,
  };

  const refs = {
    galleryTrack: $("#galleryTrack"),
    lightbox: $("#lightbox"),
    lightboxImage: $("#lightboxImage"),
    lightboxCaption: $("#lightboxCaption"),
    categoryGrid: $("#categoryGrid"),
    categoryEmpty: $("#categoryEmpty"),
    productsActive: $("#productsActive"),
    activeCategoryTitle: $("#activeCategoryTitle"),
    activeCategoryTagline: $("#activeCategoryTagline"),
    productGrid: $("#productGrid"),
    productSearch: $("#productSearch"),
    productDialog: $("#productDialog"),
    productDialogContent: $("#productDialogContent"),
    builderDialog: $("#builderDialog"),
    builderTitle: $("#builderTitle"),
    builderProgress: $("#builderProgress"),
    builderSelections: $("#builderSelections"),
    builderPrice: $("#builderPrice"),
    builderContent: $("#builderContent"),
    builderBack: $("#builderBack"),
    builderNext: $("#builderNext"),
    cartItems: $("#cartItems"),
    cartEmpty: $("#cartEmpty"),
    summaryTotals: $("#summaryTotals"),
    summaryCount: $("#summaryCount"),
    checkoutSection: $("#pedido"),
    subtotalValue: $("#subtotalValue"),
    shippingValue: $("#shippingValue"),
    totalValue: $("#totalValue"),
    clearCart: $("#clearCart"),
    sendWhatsapp: $("#sendWhatsapp"),
    floatingCart: $("#floatingCart"),
    floatingCartCount: $("#floatingCartCount"),
    floatingCartSubtotal: $("#floatingCartSubtotal"),
    headerCartCount: $("#headerCartCount"),
    bottomCartCount: $("#bottomCartCount"),
    deliveryFields: $("#deliveryFields"),
    pickupNote: $("#pickupNote"),
    planOrderDialog: $("#planOrderDialog"),
    planOrderSummary: $("#planOrderSummary"),
    planDeliveryFields: $("#planDeliveryFields"),
    toast: $("#toast"),
  };

  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderPlanOption(option, schedule) {
    const includes = option.details.join(" ");
    return `
      <article class="plan-option-card">
        <div class="plan-option-top">
          <span>
            <strong>${escapeHtml(option.name)}</strong>
            <small>${escapeHtml(option.size)}</small>
          </span>
          <b>${formatMoney(option.price)}</b>
        </div>
        <ul class="plan-option-details">
          ${option.details.map((detail) => `<li>${escapeHtml(detail)}</li>`).join("")}
        </ul>
        <button
          class="plan-hire"
          type="button"
          data-period="${escapeHtml(option.duration)}"
          data-schedule="${escapeHtml(schedule.label)}"
          data-plan="${escapeHtml(option.name)}"
          data-size="${escapeHtml(option.size)}"
          data-includes="${escapeHtml(includes)}"
          data-price="${option.price}"
        >
          Contratar este plan
        </button>
      </article>
    `;
  }

  function renderPlanPackage(planPackage, schedule, index) {
    const lowestPrice = Math.min(...planPackage.options.map((option) => option.price));
    const priceLabel = planPackage.options.length > 1 ? `Desde ${formatMoney(lowestPrice)}` : formatMoney(lowestPrice);
    return `
      <details class="plan-package"${index === 0 ? " open" : ""}>
        <summary>
          <span>
            <small>${escapeHtml(planPackage.subtitle)}</small>
            <strong>${escapeHtml(planPackage.name)}</strong>
          </span>
          <b>${priceLabel}</b>
          <i data-lucide="chevron-down" aria-hidden="true"></i>
        </summary>
        <div class="plan-package-body">
          <div class="plan-options">
            ${planPackage.options.map((option) => renderPlanOption(option, schedule)).join("")}
          </div>
        </div>
      </details>
    `;
  }

  function renderMealPlans() {
    if (!mealPlans) return;

    Object.entries(mealPlans).forEach(([panelId, period]) => {
      const panel = $(`#${panelId}`);
      if (!panel) return;

      panel.innerHTML = `
        <div class="plan-panel-heading">
          <div>
            <span class="plan-number">${escapeHtml(period.number)}</span>
            <div>
              <p class="eyebrow">${escapeHtml(period.eyebrow)}</p>
              <h3>${escapeHtml(period.title)}</h3>
            </div>
          </div>
          <span class="weekday-pill">2 opciones</span>
        </div>
        <div class="plan-schedule-tabs" role="tablist" aria-label="Días incluidos">
          ${period.schedules
            .map(
              (schedule, index) => `
                <button
                  class="plan-schedule-tab${index === 0 ? " active" : ""}"
                  type="button"
                  role="tab"
                  aria-selected="${index === 0}"
                  aria-controls="${escapeHtml(schedule.id)}"
                  data-plan-schedule="${escapeHtml(schedule.id)}"
                >
                  <strong>${escapeHtml(schedule.shortLabel)}</strong>
                  <small>${escapeHtml(schedule.note)}</small>
                </button>
              `,
            )
            .join("")}
        </div>
        ${period.schedules
          .map(
            (schedule, index) => `
              <section
                class="plan-schedule-panel"
                id="${escapeHtml(schedule.id)}"
                role="tabpanel"
                ${index === 0 ? "" : "hidden"}
              >
                <div class="plan-schedule-intro">
                  <span>${escapeHtml(schedule.label)}</span>
                  <small>Toca un paquete para revisar todo lo que incluye.</small>
                </div>
                <div class="plan-packages">
                  ${schedule.packages.map((planPackage, packageIndex) => renderPlanPackage(planPackage, schedule, packageIndex)).join("")}
                </div>
              </section>
            `,
          )
          .join("")}
      `;
    });
  }

  function loadCart() {
    try {
      const stored = localStorage.getItem("nutryfit-clickson-cart");
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveCart() {
    try {
      localStorage.setItem("nutryfit-clickson-cart", JSON.stringify(state.cart));
    } catch {
      // El carrito continúa funcional durante la sesión aunque el navegador bloquee almacenamiento.
    }
  }

  function showToast(message) {
    refs.toast.textContent = message;
    refs.toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => refs.toast.classList.remove("show"), 2600);
  }

  function openDialog(dialog) {
    if (!dialog.open) dialog.showModal();
    document.body.classList.add("dialog-open");
  }

  function closeDialog(dialog) {
    if (dialog.open) dialog.close();
    if (!$$("dialog[open]").length) document.body.classList.remove("dialog-open");
  }

  function updateOpenStatus() {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: data.business.timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = Object.fromEntries(
      formatter
        .formatToParts(new Date())
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value]),
    );
    const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const minutes = Number(parts.hour) * 60 + Number(parts.minute);
    const isOpen = weekdays.includes(parts.weekday) && minutes >= 420 && minutes < 1080;
    const element = $("#openStatus");
    element.classList.toggle("closed", !isOpen);
    $("strong", element).textContent = isOpen ? "Abierto ahora · cierra a las 6:00 p. m." : "Cerrado ahora · consulta por WhatsApp";
  }

  function renderGallery() {
    refs.galleryTrack.innerHTML = data.gallery
      .map(
        (item, index) => `
          <button class="gallery-item" type="button" data-gallery-index="${index}" aria-label="Ampliar ${escapeHtml(item.alt)}">
            <img src="${item.image}" alt="${escapeHtml(item.alt)}" loading="lazy" />
            <span><i data-lucide="expand" aria-hidden="true"></i></span>
          </button>
        `,
      )
      .join("");
    $$("[data-gallery-index]", refs.galleryTrack).forEach((button) => {
      button.addEventListener("click", () => openLightbox(Number(button.dataset.galleryIndex)));
    });
  }

  function openLightbox(index) {
    state.lightboxIndex = (index + data.gallery.length) % data.gallery.length;
    const item = data.gallery[state.lightboxIndex];
    refs.lightboxImage.src = item.image;
    refs.lightboxImage.alt = item.alt;
    refs.lightboxCaption.textContent = item.alt;
    openDialog(refs.lightbox);
  }

  function renderCategories() {
    refs.categoryGrid.innerHTML = data.categories
      .filter((category) => category.id !== "build-poke")
      .map((category) => {
        const count = data.products.filter((product) => product.categoryId === category.id).length;
        return `
          <button
            class="category-card${state.selectedCategory === category.id ? " selected" : ""}"
            type="button"
            data-category="${category.id}"
            aria-pressed="${state.selectedCategory === category.id}"
          >
            <img src="${category.image}" alt="" loading="lazy" />
            <div class="category-card-content">
              <div>
                <h3>${escapeHtml(category.name)}</h3>
                <p>${count} ${count === 1 ? "opción" : "opciones"}</p>
              </div>
              <span class="category-icon"><i data-lucide="${category.icon}" aria-hidden="true"></i></span>
            </div>
          </button>
        `;
      })
      .join("");

    $$("[data-category]", refs.categoryGrid).forEach((button) => {
      button.addEventListener("click", () => selectCategory(button.dataset.category));
    });
    refreshIcons();
  }

  function selectCategory(categoryId) {
    state.selectedCategory = categoryId;
    state.search = "";
    refs.productSearch.value = "";
    refs.productSearch.disabled = false;
    refs.productSearch.placeholder = "Buscar platillo o ingrediente";
    refs.categoryEmpty.hidden = true;
    refs.productsActive.hidden = false;
    renderCategories();
    renderProducts();
    window.setTimeout(() => {
      refs.productsActive.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  function closeCategory() {
    state.selectedCategory = null;
    state.search = "";
    refs.productSearch.value = "";
    refs.productSearch.disabled = false;
    refs.productSearch.placeholder = "Buscar platillo o ingrediente";
    refs.categoryEmpty.hidden = false;
    refs.productsActive.hidden = true;
    renderCategories();
  }

  function renderProducts() {
    const category = data.categories.find((item) => item.id === state.selectedCategory);
    const query = state.search.trim().toLocaleLowerCase("es-MX");
    if (!category && !query) return;
    refs.categoryEmpty.hidden = true;
    refs.productsActive.hidden = false;
    refs.activeCategoryTitle.textContent = category?.name || "Resultados de búsqueda";
    refs.activeCategoryTagline.textContent = category?.tagline || `Coincidencias para “${state.search.trim()}” en todo el menú.`;
    const products = data.products.filter(
      (product) =>
        (!category || product.categoryId === category.id) &&
        (!query ||
          [
            product.name,
            product.description,
            ...(product.choices || []),
            ...(product.addonGroups || []).flatMap((group) => group.options.map((option) => option.label)),
          ]
            .join(" ")
            .toLocaleLowerCase("es-MX")
            .includes(query)),
    );

    refs.productGrid.innerHTML = products.length
      ? products
          .map(
            (product) => `
              <article class="product-card">
                <div class="product-card-image">
                  <img src="${product.image}" alt="${escapeHtml(product.name)}" loading="lazy" />
                  ${product.badge ? `<span class="product-badge">${escapeHtml(product.badge)}</span>` : ""}
                </div>
                <div class="product-card-copy">
                  <h4>${escapeHtml(product.name)}</h4>
                  <p>${escapeHtml(product.description)}</p>
                  ${product.reviewNote ? `<span class="review-note">${escapeHtml(product.reviewNote)}</span>` : ""}
                  <div class="product-card-footer">
                    <span class="product-price${
                      product.price == null && !product.priceFrom && !product.priceOptions?.length ? " missing" : ""
                    }">
                      ${
                        product.priceFrom
                          ? `Desde ${formatMoney(product.priceFrom)}`
                          : product.priceOptions?.length
                            ? `Desde ${formatMoney(Math.min(...product.priceOptions.map((option) => option.price)))}`
                          : product.price != null
                            ? formatMoney(product.price)
                            : "Por confirmar"
                      }
                    </span>
                    <button class="button button-primary" type="button" data-product="${product.id}">
                      ${
                        product.configurable
                          ? "Personalizar"
                          : product.price != null || product.priceOptions?.length
                            ? "Ver producto"
                            : "Consultar precio"
                      }
                    </button>
                  </div>
                </div>
              </article>
            `,
          )
          .join("")
      : `<div class="category-empty"><i data-lucide="search-x" aria-hidden="true"></i><h3>Sin coincidencias</h3><p>Prueba con otro nombre o ingrediente${category ? ` dentro de ${escapeHtml(category.name)}` : ""}.</p></div>`;

    $$("[data-product]", refs.productGrid).forEach((button) => {
      button.addEventListener("click", () => openProduct(button.dataset.product));
    });
    refreshIcons();
  }

  function renderAddonGroups(product) {
    if (!product.addonGroups?.length) return "";
    return product.addonGroups
      .map(
        (group) => `
          <fieldset class="simple-price-options simple-addon-options">
            <legend>${escapeHtml(group.label)}${group.required ? " *" : ""}</legend>
            ${group.note ? `<p class="addon-note">${escapeHtml(group.note)}</p>` : ""}
            ${group.options
              .map(
                (option, index) => `
                  <label>
                    <input
                      type="${group.single ? "radio" : "checkbox"}"
                      name="addon-${escapeHtml(group.id)}"
                      value="${index}"
                      data-addon-group="${escapeHtml(group.id)}"
                      ${group.single && index === 0 ? "checked" : ""}
                    />
                    <span>
                      <strong>${escapeHtml(option.label)}</strong>
                      <b>${group.selectionOnly ? "Elegir" : option.price == null ? "Por confirmar" : option.price ? `+${formatMoney(option.price)}` : "Incluido"}</b>
                    </span>
                  </label>
                `,
              )
              .join("")}
          </fieldset>
        `,
      )
      .join("");
  }

  function openProduct(productId) {
    const product = data.products.find((item) => item.id === productId);
    if (!product) return;
    const hasKnownPrice = product.price != null || product.priceOptions?.length;
    refs.productDialogContent.innerHTML = `
      <img class="product-modal-image" src="${product.image}" alt="${escapeHtml(product.name)}" />
      <div class="product-modal-copy">
        <p class="eyebrow">${
          product.configurable ? "PERSONALIZA TU POKE" : hasKnownPrice ? "PRODUCTO NUTRYFIT" : "PRODUCTO EN REVISIÓN"
        }</p>
        <h2 id="productModalTitle">${escapeHtml(product.name)}</h2>
        <p>${escapeHtml(product.description)}</p>
        ${
          product.configurable
            ? `
              <div class="missing-price-card">
                <i data-lucide="badge-check" aria-hidden="true"></i>
                <div>
                  <strong>Precios confirmados desde ${formatMoney(product.priceFrom)}</strong>
                  <span>El total cambia automáticamente según tamaño, proteína y extras.</span>
                </div>
              </div>
              <button class="button button-primary button-full" id="startBuilder" type="button">
                <i data-lucide="sliders-horizontal" aria-hidden="true"></i>
                Armar mi poke
              </button>
            `
            : hasKnownPrice
              ? `
                ${
                  product.choices?.length
                    ? `
                      <fieldset class="simple-price-options simple-choice-options">
                        <legend>${escapeHtml(product.choiceLabel || "Elige una opción")}</legend>
                        ${product.choices
                          .map(
                            (choice, index) => `
                              <label>
                                <input type="radio" name="simpleProductChoice" value="${index}" ${index === 0 ? "checked" : ""} />
                                <span><strong>${escapeHtml(choice)}</strong></span>
                              </label>
                            `,
                          )
                          .join("")}
                      </fieldset>
                    `
                    : ""
                }
                ${
                  product.priceOptions?.length
                    ? `
                      <fieldset class="simple-price-options">
                        <legend>Elige una opción</legend>
                        ${product.priceOptions
                          .map(
                            (option, index) => `
                              <label>
                                <input type="radio" name="simplePriceOption" value="${index}" ${index === 0 ? "checked" : ""} />
                                <span>
                                  <strong>${escapeHtml(option.label)}</strong>
                                  <b>${formatMoney(option.price)}</b>
                                </span>
                              </label>
                            `,
                          )
                          .join("")}
                      </fieldset>
                    `
                    : `
                      <div class="simple-fixed-price">
                        <span>Precio</span>
                        <strong>${formatMoney(product.price)}</strong>
                      </div>
                    `
                }
                ${renderAddonGroups(product)}
                <label class="field simple-notes">
                  <span>Notas para este producto (opcional)</span>
                  <textarea id="simpleProductNotes" rows="2" placeholder="Ej. sin cebolla"></textarea>
                </label>
                <div class="simple-add-row">
                  <div class="qty-control simple-qty">
                    <button id="simpleQtyMinus" type="button" aria-label="Disminuir cantidad">
                      <i data-lucide="minus" aria-hidden="true"></i>
                    </button>
                    <span id="simpleQtyValue">1</span>
                    <button id="simpleQtyPlus" type="button" aria-label="Aumentar cantidad">
                      <i data-lucide="plus" aria-hidden="true"></i>
                    </button>
                  </div>
                  <div class="simple-total">
                    <small>Total</small>
                    <strong id="simpleProductTotal"></strong>
                  </div>
                </div>
                <button class="button button-primary button-full" id="addSimpleProduct" type="button">
                  <i data-lucide="shopping-bag" aria-hidden="true"></i>
                  Agregar al pedido
                </button>
              `
            : `
              <div class="missing-price-card">
                <i data-lucide="info" aria-hidden="true"></i>
                <div>
                  <strong>Precio por confirmar.</strong>
                  <span>Consulta disponibilidad y precio directamente con Nutryfit por WhatsApp.</span>
                </div>
              </div>
              ${product.reviewNote ? `<p class="review-note">${escapeHtml(product.reviewNote)}</p>` : ""}
              <button class="button button-whatsapp button-full" id="consultProduct" type="button">
                <i data-lucide="message-circle" aria-hidden="true"></i>
                Consultar por WhatsApp
              </button>
            `
        }
      </div>
    `;

    openDialog(refs.productDialog);
    refreshIcons();
    if (product.configurable) {
      $("#startBuilder").addEventListener("click", () => {
        closeDialog(refs.productDialog);
        startBuilder();
      });
    } else if (hasKnownPrice) {
      let quantity = 1;
      const selectedOption = () => {
        if (!product.priceOptions?.length) return null;
        const selected = $('input[name="simplePriceOption"]:checked', refs.productDialogContent);
        return product.priceOptions[Number(selected?.value || 0)];
      };
      const selectedChoice = () => {
        if (!product.choices?.length) return "";
        const selected = $('input[name="simpleProductChoice"]:checked', refs.productDialogContent);
        return product.choices[Number(selected?.value || 0)];
      };
      const selectedAddons = () =>
        (product.addonGroups || []).flatMap((group) =>
          $$(`[data-addon-group="${group.id}"]:checked`, refs.productDialogContent).map((input) => {
            const option = group.options[Number(input.value)];
            return { group: group.label, name: option.label, price: option.price };
          }),
        );
      const unitPrice = () =>
        (selectedOption()?.price ?? product.price) +
        selectedAddons().reduce((sum, addon) => sum + (addon.price || 0), 0);
      const hasPendingAddons = () => selectedAddons().some((addon) => addon.price == null);
      const updateSimpleProductTotal = () => {
        $("#simpleQtyValue").textContent = quantity;
        $("#simpleProductTotal").textContent = `${formatMoney(unitPrice() * quantity)}${hasPendingAddons() ? " + ajuste por confirmar" : ""}`;
        $("#simpleQtyMinus").disabled = quantity <= 1;
      };
      $$('input[name="simplePriceOption"]', refs.productDialogContent).forEach((input) => {
        input.addEventListener("change", updateSimpleProductTotal);
      });
      $$('[data-addon-group]', refs.productDialogContent).forEach((input) => {
        input.addEventListener("change", updateSimpleProductTotal);
      });
      $("#simpleQtyMinus").addEventListener("click", () => {
        quantity = Math.max(1, quantity - 1);
        updateSimpleProductTotal();
      });
      $("#simpleQtyPlus").addEventListener("click", () => {
        quantity = Math.min(20, quantity + 1);
        updateSimpleProductTotal();
      });
      $("#addSimpleProduct").addEventListener("click", () => {
        addSimpleProductToCart(
          product,
          selectedOption(),
          selectedChoice(),
          selectedAddons(),
          quantity,
          $("#simpleProductNotes").value.trim(),
        );
      });
      updateSimpleProductTotal();
    } else {
      $("#consultProduct").addEventListener("click", () => consultProduct(product));
    }
  }

  function consultProduct(product) {
    const message = `Hola NUTRYFIT, quisiera consultar el precio, descripción y disponibilidad de: ${product.name}.`;
    window.open(`https://wa.me/${data.business.whatsapp}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
  }

  function addSimpleProductToCart(product, option, choice, addons, quantity, notes) {
    const missingRequired = (product.addonGroups || []).find(
      (group) => group.required && !addons.some((addon) => addon.group === group.label),
    );
    if (missingRequired) {
      showToast(`Selecciona: ${missingRequired.label}.`);
      return;
    }
    const item = {
      id: `product-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      productId: product.id,
      name: product.name,
      image: product.image,
      quantity,
      unitPrice: (option?.price ?? product.price) + addons.reduce((sum, addon) => sum + (addon.price || 0), 0),
      pendingAdjustments: addons.filter((addon) => addon.price == null).map((addon) => addon.name),
      config: {
        type: "simple",
        option: option?.label || "",
        choice,
        addons,
        notes,
      },
    };
    state.cart.push(item);
    saveCart();
    renderCart();
    closeDialog(refs.productDialog);
    showToast(`${item.quantity} × ${item.name} agregado al pedido.`);
  }

  function createBuilderState() {
    return {
      step: 1,
      size: null,
      base: null,
      doubleBase: false,
      protein: null,
      doubleProtein: false,
      cold: [],
      extraCold: [],
      dressings: [],
      crunch: null,
      extras: {},
      notes: "",
      quantity: 1,
    };
  }

  function startBuilder() {
    state.builder = createBuilderState();
    renderBuilder();
    openDialog(refs.builderDialog);
  }

  function currentSize() {
    return data.pokeBuilder.sizes.find((size) => size.id === state.builder.size);
  }

  function currentProtein() {
    return data.pokeBuilder.proteins.find((protein) => protein.id === state.builder.protein);
  }

  function builderBasePrice() {
    const protein = currentProtein();
    if (!protein || !state.builder.size) return 0;
    return data.pokeBuilder.prices[protein.group][state.builder.size];
  }

  function builderExtrasTotal() {
    return state.builder.extraCold.length * 20 + data.pokeBuilder.extras.reduce(
      (sum, extra) => sum + (state.builder.extras[extra.id] || 0) * extra.price,
      0,
    );
  }

  function builderUnitPrice() {
    return builderBasePrice() + builderExtrasTotal();
  }

  function builderTotal() {
    return builderUnitPrice() * state.builder.quantity;
  }

  function builderSelectionSummary() {
    const size = currentSize();
    const protein = currentProtein();
    const parts = [size?.name, state.builder.base, protein?.name].filter(Boolean);
    return parts.length ? parts.join(" · ") : "Comienza eligiendo un tamaño";
  }

  function optionCard({ type, name, value, label, detail = "", checked = false, disabled = false }) {
    return `
      <label class="option-card">
        <input type="${type}" name="${name}" value="${escapeHtml(value)}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""} />
        <span>${escapeHtml(label)}${detail ? `<small>${escapeHtml(detail)}</small>` : ""}</span>
      </label>
    `;
  }

  function renderBuilder() {
    const builder = state.builder;
    const visibleStep = Math.min(builder.step, 7);
    refs.builderTitle.innerHTML =
      builder.step === 8 ? `Revisa tu poke` : `Paso <span id="builderStepNumber">${visibleStep}</span> de 7`;
    refs.builderProgress.style.width = `${(visibleStep / 7) * 100}%`;
    refs.builderSelections.textContent = builderSelectionSummary();
    refs.builderPrice.textContent = builderBasePrice() ? formatMoney(builderTotal()) : "Por calcular";
    refs.builderBack.disabled = builder.step === 1;
    refs.builderBack.style.visibility = builder.step === 1 ? "hidden" : "visible";
    refs.builderNext.innerHTML =
      builder.step === 8
        ? `<i data-lucide="shopping-bag" aria-hidden="true"></i> Agregar al pedido`
        : `Continuar <i data-lucide="arrow-right" aria-hidden="true"></i>`;

    const renders = {
      1: renderSizeStep,
      2: renderBaseStep,
      3: renderProteinStep,
      4: renderColdStep,
      5: renderDressingStep,
      6: renderCrunchStep,
      7: renderExtrasStep,
      8: renderReviewStep,
    };
    refs.builderContent.innerHTML = renders[builder.step]();
    bindBuilderStep();
    refreshIcons();
  }

  function renderSizeStep() {
    return `
      <div class="builder-intro">
        <p class="eyebrow">PASO 1</p>
        <h3>Elige tu tamaño</h3>
        <p>El tamaño define el precio y cuántos ingredientes de barra fría puedes elegir.</p>
      </div>
      <div class="option-grid">
        ${data.pokeBuilder.sizes
          .map((size) =>
            optionCard({
              type: "radio",
              name: "builder-size",
              value: size.id,
              label: size.name,
              detail: `${size.grams} · hasta ${size.coldLimit} ingredientes`,
              checked: state.builder.size === size.id,
            }),
          )
          .join("")}
      </div>
    `;
  }

  function renderBaseStep() {
    return `
      <div class="builder-intro">
        <p class="eyebrow">PASO 2</p>
        <h3>Elige tu base</h3>
        <p>Selecciona una base. Si deseas doble porción, indícalo aquí mismo.</p>
      </div>
      <label class="builder-inline-extra">
        <input type="checkbox" id="builderDoubleBase" ${state.builder.doubleBase ? "checked" : ""} />
        <span><strong>Quiero doble base</strong><small>Cargo por confirmar con Nutryfit</small></span>
      </label>
      <div class="option-grid">
        ${data.pokeBuilder.bases
          .map((base) =>
            optionCard({
              type: "radio",
              name: "builder-base",
              value: base,
              label: base,
              checked: state.builder.base === base,
            }),
          )
          .join("")}
      </div>
    `;
  }

  function renderProteinStep() {
    const size = currentSize();
    return `
      <div class="builder-intro">
        <p class="eyebrow">PASO 3</p>
        <h3>Elige tu proteína</h3>
        <p>El precio cambia según proteína y tamaño. Puedes pedir doble proteína en este paso.</p>
      </div>
      <label class="builder-inline-extra">
        <input type="checkbox" id="builderDoubleProtein" ${state.builder.doubleProtein ? "checked" : ""} />
        <span><strong>Quiero doble proteína</strong><small>Cargo por confirmar con Nutryfit</small></span>
      </label>
      <div class="option-grid">
        ${data.pokeBuilder.proteins
          .map((protein) =>
            optionCard({
              type: "radio",
              name: "builder-protein",
              value: protein.id,
              label: protein.name,
              detail: formatMoney(data.pokeBuilder.prices[protein.group][state.builder.size]),
              checked: state.builder.protein === protein.id,
            }),
          )
          .join("")}
      </div>
    `;
  }

  function renderColdStep() {
    const limit = currentSize().coldLimit;
    const count = state.builder.cold.length;
    const atLimit = count >= limit;
    return `
      <div class="builder-intro">
        <p class="eyebrow">PASO 4</p>
        <h3>Barra fría</h3>
        <p>Elige hasta ${limit} ingredientes para tu tamaño ${escapeHtml(currentSize().name)}.</p>
      </div>
      <div class="selection-counter${atLimit ? " limit" : ""}">
        <span>${count} de ${limit} ingredientes seleccionados</span>
        <span>${atLimit ? "Límite alcanzado" : `${limit - count} disponibles`}</span>
      </div>
      <div class="option-grid">
        ${data.pokeBuilder.coldBar
          .map((ingredient) =>
            optionCard({
              type: "checkbox",
              name: "builder-cold",
              value: ingredient,
              label: ingredient,
              checked: state.builder.cold.includes(ingredient),
              disabled: atLimit && !state.builder.cold.includes(ingredient),
            }),
          )
          .join("")}
      </div>
      <div class="builder-extra-cold">
        <div class="builder-intro compact">
          <p class="eyebrow">TOPPINGS EXTRA · +$20 C/U</p>
          <h4>¿Quieres agregar algo más?</h4>
          <p>Marca exactamente los ingredientes extra que deseas; aparecerán por nombre en tu pedido.</p>
        </div>
        <div class="option-grid">
          ${data.pokeBuilder.coldBar
            .map((ingredient) =>
              optionCard({
                type: "checkbox",
                name: "builder-extra-cold",
                value: ingredient,
                label: ingredient,
                detail: "+$20",
                checked: state.builder.extraCold.includes(ingredient),
              }),
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function renderDressingStep() {
    const count = state.builder.dressings.length;
    const atLimit = count >= 2;
    return `
      <div class="builder-intro">
        <p class="eyebrow">PASO 5</p>
        <h3>Elige 2 aderezos</h3>
        <p>Necesitas seleccionar exactamente dos para continuar.</p>
      </div>
      <div class="selection-counter${atLimit ? " limit" : ""}">
        <span>${count} de 2 aderezos seleccionados</span>
        <span>${atLimit ? "Listo" : `Faltan ${2 - count}`}</span>
      </div>
      <div class="option-grid">
        ${data.pokeBuilder.dressings
          .map((dressing) =>
            optionCard({
              type: "checkbox",
              name: "builder-dressing",
              value: dressing,
              label: dressing,
              checked: state.builder.dressings.includes(dressing),
              disabled: atLimit && !state.builder.dressings.includes(dressing),
            }),
          )
          .join("")}
      </div>
      <p class="builder-pending">Si lo prefieres sin aderezo, indícalo en las notas del siguiente paso.</p>
    `;
  }

  function renderCrunchStep() {
    return `
      <div class="builder-intro">
        <p class="eyebrow">PASO 6</p>
        <h3>Elige un crocante</h3>
        <p>Selecciona exactamente una opción para dar el toque final.</p>
      </div>
      <div class="option-grid">
        ${data.pokeBuilder.crunch
          .map((crunch) =>
            optionCard({
              type: "radio",
              name: "builder-crunch",
              value: crunch,
              label: crunch,
              checked: state.builder.crunch === crunch,
            }),
          )
          .join("")}
      </div>
      <p class="builder-pending">Si lo prefieres sin crocante, indícalo en las notas del siguiente paso.</p>
    `;
  }

  function renderExtrasStep() {
    return `
      <div class="builder-intro">
        <p class="eyebrow">PASO 7</p>
        <h3>Extras y notas</h3>
        <p>Agrega varios extras, cambia sus cantidades y deja instrucciones para tu poke.</p>
      </div>
      <div class="extra-list">
        ${data.pokeBuilder.extras
          .map((extra) => {
            const quantity = state.builder.extras[extra.id] || 0;
            return `
              <div class="extra-row">
                <h4>${escapeHtml(extra.name)}</h4>
                <span>+${formatMoney(extra.price)}</span>
                <div class="qty-control">
                  <button type="button" data-extra-action="minus" data-extra="${extra.id}" aria-label="Quitar ${escapeHtml(extra.name)}">
                    <i data-lucide="minus" aria-hidden="true"></i>
                  </button>
                  <span>${quantity}</span>
                  <button type="button" data-extra-action="plus" data-extra="${extra.id}" aria-label="Agregar ${escapeHtml(extra.name)}">
                    <i data-lucide="plus" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
      <label class="builder-field">
        <span>Notas para este poke (opcional)</span>
        <textarea id="builderNotes" placeholder="Ej. sin cebolla, por favor">${escapeHtml(state.builder.notes)}</textarea>
      </label>
      <div class="builder-quantity">
        <strong>Cantidad de pokes</strong>
        <div class="qty-control">
          <button type="button" id="builderQtyMinus" aria-label="Disminuir cantidad"><i data-lucide="minus" aria-hidden="true"></i></button>
          <span>${state.builder.quantity}</span>
          <button type="button" id="builderQtyPlus" aria-label="Aumentar cantidad"><i data-lucide="plus" aria-hidden="true"></i></button>
        </div>
      </div>
    `;
  }

  function renderReviewStep() {
    const size = currentSize();
    const protein = currentProtein();
    const extras = data.pokeBuilder.extras
      .filter((extra) => state.builder.extras[extra.id])
      .map((extra) => `${extra.name} × ${state.builder.extras[extra.id]}`)
      .join(", ");
    const pendingAdjustments = [
      state.builder.doubleBase ? "Doble base" : "",
      state.builder.doubleProtein ? "Doble proteína" : "",
    ].filter(Boolean);
    const rows = [
      ["Tamaño", `${size.name} · ${size.grams}`, 1],
      ["Base", `${state.builder.base}${state.builder.doubleBase ? " · doble base (cargo por confirmar)" : ""}`, 2],
      ["Proteína", `${protein.name}${state.builder.doubleProtein ? " · doble proteína (cargo por confirmar)" : ""}`, 3],
      ["Barra fría", state.builder.cold.length ? state.builder.cold.join(", ") : "Sin ingredientes seleccionados", 4],
      ["Toppings extra", state.builder.extraCold.length ? state.builder.extraCold.join(", ") : "Sin toppings extra", 4],
      ["Aderezos", state.builder.dressings.join(", "), 5],
      ["Crocante", state.builder.crunch, 6],
      [
        "Extras, notas y cantidad",
        `${extras || "Sin extras"} · ${state.builder.notes || "Sin notas"} · Cantidad ${state.builder.quantity}`,
        7,
      ],
    ];
    return `
      <div class="builder-intro">
        <p class="eyebrow">REVISIÓN FINAL</p>
        <h3>Así queda tu poke</h3>
        <p>Puedes editar cualquier paso sin perder las otras selecciones.</p>
      </div>
      <div class="review-list">
        ${rows
          .map(
            ([label, value, step]) => `
              <div class="review-row">
                <div><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>
                <button type="button" data-edit-step="${step}">Editar</button>
              </div>
            `,
          )
          .join("")}
      </div>
      <div class="review-total">
        <span>${state.builder.quantity} × ${formatMoney(builderUnitPrice())}</span>
        <strong>${formatMoney(builderTotal())}${pendingAdjustments.length ? " + ajuste por confirmar" : ""}</strong>
      </div>
    `;
  }

  function bindBuilderStep() {
    const builder = state.builder;
    if (builder.step === 1) {
      $$('input[name="builder-size"]', refs.builderContent).forEach((input) => {
        input.addEventListener("change", () => {
          builder.size = input.value;
          const limit = currentSize().coldLimit;
          if (builder.cold.length > limit) {
            builder.cold = builder.cold.slice(0, limit);
            showToast(`Ajustamos la barra fría al límite de ${limit} ingredientes.`);
          }
          renderBuilder();
        });
      });
    }
    if (builder.step === 2) {
      $$('input[name="builder-base"]', refs.builderContent).forEach((input) => {
        input.addEventListener("change", () => {
          builder.base = input.value;
          renderBuilder();
        });
      });
      $("#builderDoubleBase")?.addEventListener("change", (event) => {
        builder.doubleBase = event.target.checked;
        renderBuilder();
      });
    }
    if (builder.step === 3) {
      $$('input[name="builder-protein"]', refs.builderContent).forEach((input) => {
        input.addEventListener("change", () => {
          builder.protein = input.value;
          renderBuilder();
        });
      });
      $("#builderDoubleProtein")?.addEventListener("change", (event) => {
        builder.doubleProtein = event.target.checked;
        renderBuilder();
      });
    }
    if (builder.step === 4) {
      $$('input[name="builder-cold"]', refs.builderContent).forEach((input) => {
        input.addEventListener("change", () => {
          if (input.checked) builder.cold.push(input.value);
          else builder.cold = builder.cold.filter((item) => item !== input.value);
          renderBuilder();
        });
      });
      $$('input[name="builder-extra-cold"]', refs.builderContent).forEach((input) => {
        input.addEventListener("change", () => {
          if (input.checked) builder.extraCold.push(input.value);
          else builder.extraCold = builder.extraCold.filter((item) => item !== input.value);
          renderBuilder();
        });
      });
    }
    if (builder.step === 5) {
      $$('input[name="builder-dressing"]', refs.builderContent).forEach((input) => {
        input.addEventListener("change", () => {
          if (input.checked) builder.dressings.push(input.value);
          else builder.dressings = builder.dressings.filter((item) => item !== input.value);
          renderBuilder();
        });
      });
    }
    if (builder.step === 6) {
      $$('input[name="builder-crunch"]', refs.builderContent).forEach((input) => {
        input.addEventListener("change", () => {
          builder.crunch = input.value;
          renderBuilder();
        });
      });
    }
    if (builder.step === 7) {
      $$("[data-extra-action]", refs.builderContent).forEach((button) => {
        button.addEventListener("click", () => {
          const current = builder.extras[button.dataset.extra] || 0;
          builder.extras[button.dataset.extra] =
            button.dataset.extraAction === "plus" ? Math.min(current + 1, 9) : Math.max(current - 1, 0);
          renderBuilder();
        });
      });
      $("#builderQtyMinus")?.addEventListener("click", () => {
        builder.quantity = Math.max(1, builder.quantity - 1);
        renderBuilder();
      });
      $("#builderQtyPlus")?.addEventListener("click", () => {
        builder.quantity = Math.min(20, builder.quantity + 1);
        renderBuilder();
      });
      $("#builderNotes")?.addEventListener("input", (event) => {
        builder.notes = event.target.value;
      });
    }
    if (builder.step === 8) {
      $$("[data-edit-step]", refs.builderContent).forEach((button) => {
        button.addEventListener("click", () => {
          builder.step = Number(button.dataset.editStep);
          renderBuilder();
        });
      });
    }
  }

  function validateBuilderStep() {
    const builder = state.builder;
    const messages = {
      1: [builder.size, "Elige un tamaño para continuar."],
      2: [builder.base, "Elige exactamente una base."],
      3: [builder.protein, "Elige una proteína para calcular el precio."],
      5: [builder.dressings.length === 2, "Selecciona exactamente 2 aderezos."],
      6: [builder.crunch, "Elige exactamente 1 crocante."],
    };
    if (!messages[builder.step]) return true;
    if (!messages[builder.step][0]) {
      showToast(messages[builder.step][1]);
      return false;
    }
    return true;
  }

  function nextBuilderStep() {
    if (state.builder.step === 8) {
      addBuilderToCart();
      return;
    }
    if (!validateBuilderStep()) return;
    state.builder.step += 1;
    renderBuilder();
    refs.builderContent.scrollTop = 0;
  }

  function previousBuilderStep() {
    if (state.builder.step <= 1) return;
    state.builder.step -= 1;
    renderBuilder();
    refs.builderContent.scrollTop = 0;
  }

  function addBuilderToCart() {
    const product = data.products.find((item) => item.id === "custom-poke");
    const size = currentSize();
    const protein = currentProtein();
    const extras = data.pokeBuilder.extras
      .filter((extra) => state.builder.extras[extra.id])
      .map((extra) => ({
        name: extra.name,
        quantity: state.builder.extras[extra.id],
        price: extra.price,
      }));
    state.builder.extraCold.forEach((ingredient) => {
      extras.push({ name: `Topping extra: ${ingredient}`, quantity: 1, price: 20 });
    });
    const pendingAdjustments = [
      state.builder.doubleBase ? "Doble base" : "",
      state.builder.doubleProtein ? "Doble proteína" : "",
    ].filter(Boolean);
    const item = {
      id: `poke-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      productId: product.id,
      name: product.name,
      image: product.image,
      quantity: state.builder.quantity,
      unitPrice: builderUnitPrice(),
      pendingAdjustments,
      config: {
        size: `${size.name} · ${size.grams}`,
        base: `${state.builder.base}${state.builder.doubleBase ? " · doble base" : ""}`,
        protein: `${protein.name}${state.builder.doubleProtein ? " · doble proteína" : ""}`,
        cold: [...state.builder.cold],
        dressings: [...state.builder.dressings],
        crunch: state.builder.crunch,
        extras,
        notes: state.builder.notes.trim(),
      },
    };
    state.cart.push(item);
    saveCart();
    renderCart();
    closeDialog(refs.builderDialog);
    showToast(`${item.quantity} ${item.quantity === 1 ? "poke agregado" : "pokes agregados"} al pedido.`);
  }

  function cartSubtotal() {
    return state.cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }

  function cartCount() {
    return state.cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  function itemConfigShort(item) {
    if (item.config.type === "simple") {
      return [
        item.config.choice,
        item.config.option,
        item.config.addons?.length ? `${item.config.addons.length} ajustes` : "",
        item.config.notes ? "Con notas" : "",
      ]
        .filter(Boolean)
        .join(" · ") || "Producto individual";
    }
    return [
      item.config.size,
      item.config.base,
      item.config.protein,
      item.config.extras.length ? `${item.config.extras.length} extras` : "Sin extras",
    ].join(" · ");
  }

  function renderCart() {
    const count = cartCount();
    const subtotal = cartSubtotal();
    const hasItems = count > 0;
    const deliveryType = $('input[name="delivery"]:checked')?.value || "pickup";
    const hasPendingAdjustments = state.cart.some((item) => item.pendingAdjustments?.length);

    refs.headerCartCount.textContent = count;
    refs.bottomCartCount.textContent = count;
    refs.floatingCartCount.textContent = count;
    refs.floatingCartSubtotal.textContent = formatMoney(subtotal);
    refs.floatingCart.hidden = !hasItems;
    refs.checkoutSection.hidden = !hasItems;
    refs.cartEmpty.hidden = hasItems;
    refs.summaryTotals.hidden = !hasItems;
    refs.clearCart.hidden = !hasItems;
    refs.sendWhatsapp.disabled = !hasItems;
    refs.summaryCount.textContent = hasItems
      ? `${count} ${count === 1 ? "producto" : "productos"} en tu pedido.`
      : "Aún no agregas productos.";

    refs.cartItems.innerHTML = state.cart
      .map(
        (item) => `
          <article class="cart-item">
            <img src="${item.image}" alt="" />
            <div>
              <div class="cart-item-head">
                <h4>${escapeHtml(item.name)}</h4>
                <span class="cart-item-price">${formatMoney(item.unitPrice * item.quantity)}${item.pendingAdjustments?.length ? " + ajuste" : ""}</span>
              </div>
              <p class="cart-item-config">${escapeHtml(itemConfigShort(item))}</p>
              <div class="cart-item-actions">
                <div class="qty-control">
                  <button type="button" data-cart-action="minus" data-cart-id="${item.id}" aria-label="Disminuir cantidad">
                    <i data-lucide="minus" aria-hidden="true"></i>
                  </button>
                  <span>${item.quantity}</span>
                  <button type="button" data-cart-action="plus" data-cart-id="${item.id}" aria-label="Aumentar cantidad">
                    <i data-lucide="plus" aria-hidden="true"></i>
                  </button>
                </div>
                <button class="remove-item" type="button" data-cart-action="remove" data-cart-id="${item.id}" aria-label="Eliminar producto">
                  <i data-lucide="trash-2" aria-hidden="true"></i>
                </button>
              </div>
            </div>
          </article>
        `,
      )
      .join("");

    refs.subtotalValue.textContent = formatMoney(subtotal);
    if (deliveryType === "delivery") {
      refs.shippingValue.textContent = "Por confirmar";
      refs.totalValue.textContent = `${formatMoney(subtotal)}${hasPendingAdjustments ? " + ajustes" : ""} + envío`;
    } else {
      refs.shippingValue.textContent = "No aplica";
      refs.totalValue.textContent = `${formatMoney(subtotal)}${hasPendingAdjustments ? " + ajustes por confirmar" : ""}`;
    }

    $$("[data-cart-action]", refs.cartItems).forEach((button) => {
      button.addEventListener("click", () => updateCartItem(button.dataset.cartId, button.dataset.cartAction));
    });
    refreshIcons();
  }

  function updateCartItem(id, action) {
    const item = state.cart.find((cartItem) => cartItem.id === id);
    if (!item) return;
    if (action === "plus") item.quantity = Math.min(item.quantity + 1, 20);
    if (action === "minus") item.quantity = Math.max(item.quantity - 1, 1);
    if (action === "remove") state.cart = state.cart.filter((cartItem) => cartItem.id !== id);
    saveCart();
    renderCart();
  }

  function clearCart() {
    if (!state.cart.length) return;
    const confirmed = window.confirm("¿Vaciar todos los productos del pedido?");
    if (!confirmed) return;
    state.cart = [];
    saveCart();
    renderCart();
    showToast("El pedido quedó vacío.");
  }

  function updateDeliveryMode() {
    const delivery = $('input[name="delivery"]:checked').value === "delivery";
    refs.deliveryFields.hidden = !delivery;
    refs.pickupNote.hidden = delivery;
    ["#deliveryAddress", "#deliveryNeighborhood", "#deliveryReference"].forEach((selector) => {
      $(selector).required = delivery;
    });
    renderCart();
  }

  function validateCheckout() {
    const required = [$("#customerName"), $("#customerPhone"), $("#paymentMethod")];
    const delivery = $('input[name="delivery"]:checked').value === "delivery";
    if (delivery) required.push($("#deliveryAddress"), $("#deliveryNeighborhood"), $("#deliveryReference"));
    required.forEach((field) => field.classList.remove("invalid"));
    const invalid = required.find((field) => !field.value.trim());
    if (invalid) {
      invalid.classList.add("invalid");
      invalid.focus();
      showToast("Completa los campos obligatorios antes de enviar.");
      return false;
    }
    return true;
  }

  function orderFolio() {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: data.business.timezone,
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
    return `NF-${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}`;
  }

  function orderTimestamp() {
    return new Intl.DateTimeFormat("es-MX", {
      timeZone: data.business.timezone,
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date());
  }

  function generateWhatsAppMessage() {
    const delivery = $('input[name="delivery"]:checked').value;
    const subtotal = cartSubtotal();
    const lines = [
      "🥗 *NUEVO PEDIDO NUTRYFIT*",
      "",
      `*Folio:* ${orderFolio()}`,
      `*Fecha y hora:* ${orderTimestamp()}`,
      `*Sucursal:* ${data.business.branch}`,
      "",
      "*CLIENTE*",
      `Nombre: ${$("#customerName").value.trim()}`,
      `Teléfono: ${$("#customerPhone").value.trim()}`,
      "",
      "*ENTREGA*",
      delivery === "pickup" ? `Recoger en: ${data.business.branch}` : "Modalidad: Domicilio",
    ];

    if (delivery === "pickup") {
      lines.push(`Dirección de sucursal: ${data.business.address}`);
    } else {
      lines.push(
        `Calle y número: ${$("#deliveryAddress").value.trim()}`,
        `Colonia: ${$("#deliveryNeighborhood").value.trim()}`,
        `Referencia: ${$("#deliveryReference").value.trim()}`,
        `Ubicación/Maps: ${$("#deliveryLocation").value.trim() || "No proporcionada"}`,
      );
    }

    lines.push("", "*PRODUCTOS*");
    state.cart.forEach((item, index) => {
      if (item.config.type === "simple") {
        lines.push(
          "",
          `${index + 1}. *${item.quantity} × ${item.name}*`,
          ...(item.config.choice ? [`   Selección: ${item.config.choice}`] : []),
          ...(item.config.option ? [`   Opción: ${item.config.option}`] : []),
          ...(item.config.addons?.length
            ? [
                `   Ajustes y extras: ${item.config.addons
                  .map((addon) => `${addon.name}${addon.price == null ? " (precio por confirmar)" : addon.price ? ` (+${formatMoney(addon.price)})` : ""}`)
                  .join(", ")}`,
              ]
            : []),
          `   Notas: ${item.config.notes || "Sin notas"}`,
          `   Precio unitario: ${formatMoney(item.unitPrice)}`,
          `   Importe: ${formatMoney(item.unitPrice * item.quantity)}`,
        );
        return;
      }
      lines.push(
        "",
        `${index + 1}. *${item.quantity} × ${item.name}*`,
        `   Tamaño: ${item.config.size}`,
        `   Base: ${item.config.base}`,
        `   Proteína: ${item.config.protein}`,
        `   Barra fría: ${item.config.cold.length ? item.config.cold.join(", ") : "Sin ingredientes seleccionados"}`,
        `   Aderezos: ${item.config.dressings.join(", ")}`,
        `   Crocante: ${item.config.crunch}`,
        `   Extras: ${
          item.config.extras.length
            ? item.config.extras.map((extra) => `${extra.name} × ${extra.quantity}`).join(", ")
            : "Sin extras"
        }`,
        `   Notas: ${item.config.notes || "Sin notas"}`,
        `   Precio unitario: ${formatMoney(item.unitPrice)}`,
        `   Importe: ${formatMoney(item.unitPrice * item.quantity)}`,
        ...(item.pendingAdjustments?.length
          ? [`   Ajustes por confirmar: ${item.pendingAdjustments.join(", ")}`]
          : []),
      );
    });

    lines.push(
      "",
      "*RESUMEN*",
      `Subtotal: ${formatMoney(subtotal)}`,
      delivery === "delivery" ? "Envío: Por confirmar" : "Envío: No aplica",
      delivery === "delivery"
        ? `Total calculado sin envío: ${formatMoney(subtotal)}`
        : `Total: ${formatMoney(subtotal)}`,
      `Método de pago preferido: ${$("#paymentMethod").value.trim()}`,
      `Cambio para efectivo: ${$("#cashAmount").value.trim() || "No indicado"}`,
      `Notas generales: ${$("#generalNotes").value.trim() || "Sin notas"}`,
      "",
      "Favor de confirmar disponibilidad y total final. ¡Gracias!",
    );
    return lines.join("\n");
  }

  function sendWhatsAppOrder() {
    if (!state.cart.length) {
      showToast("Agrega al menos un producto al pedido.");
      return;
    }
    if (!validateCheckout()) return;
    const message = generateWhatsAppMessage();
    const url = `https://wa.me/${data.business.whatsapp}?text=${encodeURIComponent(message)}`;
    document.documentElement.dataset.lastWhatsappMessage = message;
    document.documentElement.dataset.lastWhatsappUrl = url;
    window.open(url, "_blank", "noopener");
  }

  function scrollToOrder() {
    if (!state.cart.length) {
      $("#menu").scrollIntoView({ behavior: "smooth", block: "start" });
      showToast("Elige una categoría y agrega tu primer producto.");
      return;
    }
    if (state.selectedCategory) closeCategory();
    window.requestAnimationFrame(() => {
      $("#pedido").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function openPlanOrder(button) {
    state.selectedPlan = {
      period: button.dataset.period,
      schedule: button.dataset.schedule,
      plan: button.dataset.plan,
      size: button.dataset.size,
      includes: button.dataset.includes,
      price: Number(button.dataset.price),
    };
    refs.planOrderSummary.innerHTML = `
      <span>${escapeHtml(state.selectedPlan.period)} · ${escapeHtml(state.selectedPlan.schedule)}</span>
      <strong>${escapeHtml(state.selectedPlan.plan)} · ${escapeHtml(state.selectedPlan.size)}</strong>
      <b>${formatMoney(state.selectedPlan.price)}</b>
    `;
    $("#planOrderForm").reset();
    refs.planDeliveryFields.hidden = true;
    openDialog(refs.planOrderDialog);
    refreshIcons();
  }

  function updatePlanDeliveryMode() {
    const delivery = $('input[name="planDelivery"]:checked').value === "delivery";
    refs.planDeliveryFields.hidden = !delivery;
    [$("#planAddress"), $("#planNeighborhood"), $("#planReference")].forEach((field) => {
      field.required = delivery;
    });
  }

  function sendPlanOrder(event) {
    event.preventDefault();
    if (!state.selectedPlan) return;
    const delivery = $('input[name="planDelivery"]:checked').value;
    const required = [$("#planCustomerName"), $("#planCustomerPhone"), $("#planPaymentMethod")];
    if (delivery === "delivery") required.push($("#planAddress"), $("#planNeighborhood"), $("#planReference"));
    required.forEach((field) => field.classList.remove("invalid"));
    const invalid = required.find((field) => !field.value.trim());
    if (invalid) {
      invalid.classList.add("invalid");
      invalid.focus();
      showToast("Completa los campos obligatorios del plan.");
      return;
    }

    const plan = state.selectedPlan;
    const lines = [
      "🍏 *QUIERO CONTRATAR UN PLAN NUTRYFIT*",
      "",
      `*Duración:* ${plan.period}`,
      `*Días:* ${plan.schedule}`,
      `*Paquete:* ${plan.plan}`,
      `*Tamaño:* ${plan.size}`,
      `*Precio publicado:* ${formatMoney(plan.price)}`,
      `*Incluye:* ${plan.includes}`,
      "",
      "*CLIENTE*",
      `Nombre: ${$("#planCustomerName").value.trim()}`,
      `Teléfono: ${$("#planCustomerPhone").value.trim()}`,
      `Método de pago preferido: ${$("#planPaymentMethod").value.trim()}`,
      "",
      "*ENTREGA*",
      delivery === "pickup" ? `Recoger en: ${data.business.address}` : "Modalidad: Domicilio",
    ];
    if (delivery === "delivery") {
      lines.push(
        `Calle y número: ${$("#planAddress").value.trim()}`,
        `Colonia: ${$("#planNeighborhood").value.trim()}`,
        `Referencia: ${$("#planReference").value.trim()}`,
        `Ubicación/Maps: ${$("#planLocation").value.trim() || "No proporcionada"}`,
        "Costo de envío: Por estimar y confirmar en WhatsApp",
      );
    }
    lines.push(
      "",
      `Notas: ${$("#planNotes").value.trim() || "Sin notas"}`,
      "",
      "Quiero confirmar disponibilidad, fecha de inicio, costo de envío si aplica y total final.",
    );
    const message = lines.join("\n");
    const url = `https://wa.me/${data.business.whatsapp}?text=${encodeURIComponent(message)}`;
    document.documentElement.dataset.lastPlanWhatsappMessage = message;
    document.documentElement.dataset.lastPlanWhatsappUrl = url;
    window.open(url, "_blank", "noopener");
  }

  function bindEvents() {
    $$('[data-plan-tab]').forEach((tab) => {
      tab.addEventListener("click", () => {
        const targetId = tab.dataset.planTab;
        const targetPanel = $(`#${targetId}`);
        const shouldOpen = targetPanel.hidden;

        $$('[data-plan-tab]').forEach((item) => {
          item.classList.remove("active");
          item.setAttribute("aria-expanded", "false");
          $("[data-plan-action-label]", item).textContent = "Ver paquetes";
        });
        $$(".plan-period-panel").forEach((panel) => {
          panel.hidden = true;
          panel.classList.remove("active");
        });

        if (!shouldOpen) return;

        tab.classList.add("active");
        tab.setAttribute("aria-expanded", "true");
        $("[data-plan-action-label]", tab).textContent = "Ocultar paquetes";
        targetPanel.hidden = false;
        targetPanel.classList.add("active");
        window.requestAnimationFrame(() => {
          targetPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
      });
    });

    $$('[data-plan-schedule]').forEach((tab) => {
      tab.addEventListener("click", () => {
        const periodPanel = tab.closest(".plan-period-panel");
        const targetPanel = $(`#${tab.dataset.planSchedule}`, periodPanel);
        if (!targetPanel || tab.getAttribute("aria-selected") === "true") return;

        $$('[data-plan-schedule]', periodPanel).forEach((item) => {
          item.classList.remove("active");
          item.setAttribute("aria-selected", "false");
        });
        $$(".plan-schedule-panel", periodPanel).forEach((panel) => {
          panel.hidden = true;
        });

        tab.classList.add("active");
        tab.setAttribute("aria-selected", "true");
        targetPanel.hidden = false;
        refreshIcons();
      });
    });

    $$(".plan-hire").forEach((button) => {
      button.addEventListener("click", () => openPlanOrder(button));
    });

    $$(".app-tabs a").forEach((link) => {
      link.addEventListener("click", () => {
        $$(".app-tabs a").forEach((item) => item.classList.remove("active"));
        link.classList.add("active");
      });
    });
    $("#bottomCartButton").addEventListener("click", scrollToOrder);
    $("#quickPokeButton").addEventListener("click", () => {
      startBuilder();
    });

    $("#lightboxPrev").addEventListener("click", () => openLightbox(state.lightboxIndex - 1));
    $("#lightboxNext").addEventListener("click", () => openLightbox(state.lightboxIndex + 1));
    $("[data-close-lightbox]").addEventListener("click", () => closeDialog(refs.lightbox));
    refs.lightbox.addEventListener("click", (event) => {
      if (event.target === refs.lightbox) closeDialog(refs.lightbox);
    });

    $("[data-close-product]").addEventListener("click", () => closeDialog(refs.productDialog));
    refs.productDialog.addEventListener("click", (event) => {
      if (event.target === refs.productDialog) closeDialog(refs.productDialog);
    });

    $("#closeCategory").addEventListener("click", closeCategory);
    refs.productSearch.addEventListener("input", (event) => {
      state.search = event.target.value;
      if (!state.selectedCategory && !state.search.trim()) {
        refs.categoryEmpty.hidden = false;
        refs.productsActive.hidden = true;
      } else {
        renderProducts();
      }
    });

    $("#closeBuilder").addEventListener("click", () => closeDialog(refs.builderDialog));
    refs.builderBack.addEventListener("click", previousBuilderStep);
    refs.builderNext.addEventListener("click", nextBuilderStep);

    refs.floatingCart.addEventListener("click", scrollToOrder);
    $("#headerCartButton").addEventListener("click", scrollToOrder);
    refs.clearCart.addEventListener("click", clearCart);
    refs.sendWhatsapp.addEventListener("click", sendWhatsAppOrder);
    $$('input[name="delivery"]').forEach((radio) => radio.addEventListener("change", updateDeliveryMode));
    $$('input[name="planDelivery"]').forEach((radio) => radio.addEventListener("change", updatePlanDeliveryMode));
    $("#planOrderForm").addEventListener("submit", sendPlanOrder);
    $("[data-close-plan-order]").addEventListener("click", () => closeDialog(refs.planOrderDialog));
    refs.planOrderDialog.addEventListener("click", (event) => {
      if (event.target === refs.planOrderDialog) closeDialog(refs.planOrderDialog);
    });

    [refs.lightbox, refs.productDialog, refs.builderDialog, refs.planOrderDialog].forEach((dialog) => {
      dialog.addEventListener("close", () => {
        if (!$$("dialog[open]").length) document.body.classList.remove("dialog-open");
      });
    });

    document.addEventListener("keydown", (event) => {
      if (!refs.lightbox.open) return;
      if (event.key === "ArrowLeft") openLightbox(state.lightboxIndex - 1);
      if (event.key === "ArrowRight") openLightbox(state.lightboxIndex + 1);
    });
  }

  function initialize() {
    updateOpenStatus();
    renderMealPlans();
    renderGallery();
    renderCategories();
    renderCart();
    bindEvents();
    refreshIcons();
  }

  initialize();
})();
