import { body, nav, navState, mapWrapper } from "./globals.js";
import { initSlider } from "./slider.js";

export function initMap() {
  const map = L.map("map").setView([30.8461, -93.2893], 13);
  const mapDuration = 0.65;

  // Add customized zoom controls
  map.removeControl(map.zoomControl);

  const zoomControl = L.control({ position: "bottomright" }); // Position to bottom-right

  zoomControl.onAdd = function (map) {
    const div = L.DomUtil.create("div", "custom-zoom-controls");
    div.innerHTML = `
      <button id="zoom-in" class="text-white h-[60px] btn icon rounded-full text-xl custom-zoom-btn">+</button>
      <button id="zoom-out" class="text-white h-[60px] btn icon rounded-full text-xl custom-zoom-btn">−</button>
    `;
    L.DomEvent.disableClickPropagation(div);
    return div;
  };

  zoomControl.addTo(map);

  document
    .getElementById("zoom-in")
    .addEventListener("click", () => map.zoomIn());
  document
    .getElementById("zoom-out")
    .addEventListener("click", () => map.zoomOut());

  L.tileLayer("https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
    maxZoom: 26, // Increase max zoom for better details
    tileSize: 256, // Default Google tile size
    zoomOffset: 0,
    detectRetina: true // Enable higher resolution tiles on retina displays
}).addTo(map);

  const allBounds = L.featureGroup();

  const photoModal = document.getElementById("photo-modal");
  const photoModalPrev = document.getElementById("photo-modal-prev");
  const photoModalNext = document.getElementById("photo-modal-next");
  let photoModalImageContainer = photoModal
    ? document.getElementById("photo-modal-image-container")
    : null;
  let activePhotoSlides = [];
  let activePhotoIndex = 0;

  const syncPhotoModalControls = () => {
    const hasMultiple = activePhotoSlides.length > 1;
    if (photoModalPrev) {
      photoModalPrev.style.display = hasMultiple ? "" : "none";
      photoModalPrev.disabled = !hasMultiple;
    }
    if (photoModalNext) {
      photoModalNext.style.display = hasMultiple ? "" : "none";
      photoModalNext.disabled = !hasMultiple;
    }
  };

  const renderPhotoModalSlides = () => {
    activePhotoSlides.forEach((slide, index) => {
      if (index === activePhotoIndex) {
        slide.classList.add("active");
        slide.style.display = "";
      } else {
        slide.classList.remove("active");
        slide.style.display = "none";
      }
    });
    syncPhotoModalControls();
  };

  const stepPhotoModal = (direction) => {
    if (!activePhotoSlides.length) {
      return;
    }
    activePhotoIndex =
      (activePhotoIndex + direction + activePhotoSlides.length) %
      activePhotoSlides.length;
    renderPhotoModalSlides();
  };

  if (photoModalPrev) {
    photoModalPrev.addEventListener("click", (event) => {
      event.stopPropagation();
      stepPhotoModal(-1);
    });
  }

  if (photoModalNext) {
    photoModalNext.addEventListener("click", (event) => {
      event.stopPropagation();
      stepPhotoModal(1);
    });
  }

  // Track which listing's modal is open so we can hide its popup button
  let currentOpenListingId = null;
  // Global guard to suppress hover popups while a modal is open
  let isListingModalOpen = false;

  // Hide the "Read More" button in any popup for the listing that's already open in the modal
  function updatePopupButtons() {
    document.querySelectorAll('.custom-popup .tooltip-content').forEach((el) => {
      const id = el.getAttribute('data-id');
      const btn = el.querySelector('.read-more');
      if (!btn) return;
      if (currentOpenListingId && id === String(currentOpenListingId)) {
        btn.style.display = 'none';
      } else {
        btn.style.display = '';
      }
    });
  }

  // Build popup HTML; omit the Read More button for the currently open listing
  function getPopupContent(listing, listingId) {
    const hideButton = currentOpenListingId && String(listingId) === currentOpenListingId;
    const buttonMarkup = hideButton
      ? ''
      : `
        <button class="block lg:hidden view-button read-more btn w-full text-white justify-between" data-id="${listingId}">
          <span class="label">Read More</span>
          <span class="btn-arrow">
            <svg xmlns="http://www.w3.org/2000/svg" class="white-arrow" width="17.159" height="15.678" viewBox="0 0 17.159 15.678">
              <g id="arrow" transform="translate(0 0.707)">
                <path id="line" d="M317.429,1015.5h15.514" transform="translate(-317.429 -1008.368)" fill="none" stroke="#fff" stroke-width="2"></path>
                <path id="point" d="M328.554,1008.346l7.132,7.132-7.132,7.132" transform="translate(-319.941 -1008.346)" fill="none" stroke="#fff" stroke-width="2"></path>
              </g>
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" class="white-arrow" width="17.159" height="15.678" viewBox="0 0 17.159 15.678">
              <g id="arrow" transform="translate(0 0.707)">
                <path id="line" d="M317.429,1015.5h15.514" transform="translate(-317.429 -1008.368)" fill="none" stroke="#fff" stroke-width="2"></path>
                <path id="point" d="M328.554,1008.346l7.132,7.132-7.132,7.132" transform="translate(-319.941 -1008.346)" fill="none" stroke="#fff" stroke-width="2"></path>
              </g>
            </svg>
          </span>
        </button>`;

    return `
      <div class="tooltip-content" data-id="${listingId}">
        <div class="flex space-x-4">
          <span>${listing.address.locality || "Unknown"}, ${listing.address.administrativeArea || ""}</span>
          <span>${listing.acreage || "N/A"} Acres</span>
        </div>
        <h3 class="text-3xl">${listing.title}</h3>
        ${buttonMarkup}
      </div>
    `;
  }

  // Open modal for a listing
  const openModal = (listingId) => {
    const listing = mapData.listings.find((l) => l.id === listingId);

    if (!listing) {
      console.error(`Listing with ID ${listingId} not found.`);
      return;
    }

    // Remember which listing is open and update any visible popups
    currentOpenListingId = String(listingId);
    // Suppress hover popups while viewing a listing modal
    isListingModalOpen = true;
    // Close any map popups that might still be visible to prevent flicker
    if (typeof map.closePopup === 'function') {
      map.closePopup();
    }
    nav.classList.add('scrolled');
    // mapWrapper.classList.add('expand');

    // Modal content
    // title
    document.getElementById("modal-title").innerText =
      listing.title || "No title available";
    
    // description
    const descriptionEl = document.getElementById("modal-description");
    if (listing.description && listing.description.trim() !== "") {
      descriptionEl.querySelector('.description-text').innerText = listing.description;
      descriptionEl.style.display = ""; // Show if not empty
    } else {
      descriptionEl.style.display = "none"; // Hide if empty
    }

    // directions
    const directionsEl = document.getElementById("modal-directions");
    if (listing.directions && listing.directions.trim() !== "") {
      directionsEl.querySelector('.directions-text').innerHTML = listing.directions;
      directionsEl.style.display = "";
    } else {
      directionsEl.style.display = "none";
    }
    // address
    document.getElementById("modal-address").innerText =
      `${listing.address.locality || "Unknown"}, ${listing.address.administrativeArea || ""}`;

    // parish
    const parishEl = document.getElementById("modal-parish");
    if (listing.address.addressLine2) {
      parishEl.innerText = listing.address.addressLine2;
    } else {
      parishEl.style.display = "none";
    }
    
    // price
    const price = Number(listing.price);
    document.getElementById("modal-price").innerText = price
      ? `$${price.toLocaleString()}`
      : "Price not available";

    // acreage
    const acreage = parseFloat(listing.acreage?.replace(/,/g, ''));

    let pricePerAcre = "";
    if (acreage && price) {
      const ppa = price / acreage;
      pricePerAcre = `($${ppa.toLocaleString(undefined, { maximumFractionDigits: 0 })} per acre)`;
    }

    document.getElementById("modal-acreage").querySelector('.modal-text').innerText =
      `${listing.acreage || "N/A"} Acres ±`;

    document.getElementById("modal-price-per-acre").innerText = pricePerAcre;

    // features
    const featuresWrapper = document.getElementById("modal-features");
    const featuresList = featuresWrapper.querySelector("ul");
    featuresList.innerHTML = ""; // Clear existing features

    if (listing.features && listing.features.length > 0) {
      featuresWrapper.style.display = ""; // Show it
      listing.features.forEach((feature) => {
        const li = document.createElement("li");
        li.classList.add("col-span-6", "lg:col-span-2");
        li.innerHTML = `<span class="font-medium">${feature.title}:</span> ${feature.text}`;
        featuresList.appendChild(li);
      });
    } else {
      featuresWrapper.style.display = "none"; // Hide if empty
    }

    const modalImageContainer = document.getElementById("modal-image-container");
    const modalImageContainerWrapper = document.getElementById("modal-image-container-wrapper");
    const modalThumbPrev = document.getElementById("modal-thumb-prev");
    const modalThumbNext = document.getElementById("modal-thumb-next");

    modalImageContainer.innerHTML = "";

    const images = listing.images || [];
    let currentThumbIndex = 0;

    const setArrowVisibility = () => {
      const hasMultiple = images.length > 1;
      if (modalThumbPrev) {
        modalThumbPrev.style.display = hasMultiple ? "" : "none";
      }
      if (modalThumbNext) {
        modalThumbNext.style.display = hasMultiple ? "" : "none";
      }
    };

    const renderThumbnail = () => {
      modalImageContainer.innerHTML = "";

      if (!images.length) {
        modalImageContainerWrapper.classList.add("single");
        return;
      }

      const clampedIndex = ((currentThumbIndex % images.length) + images.length) % images.length;
      currentThumbIndex = clampedIndex;

      const imageHtml = images[clampedIndex];
      const imageDiv = document.createElement("div");
      imageDiv.classList.add(
        "modal-thumb-image",
        "w-full",
        "h-full",
        "flex",
        "items-center",
        "justify-center",
        "cursor-pointer",
        "transition-opacity",
        "hover:opacity-70"
      );
      imageDiv.innerHTML = imageHtml;
      imageDiv.addEventListener("click", () => openPhotoModal(listing, clampedIndex));
      modalImageContainer.appendChild(imageDiv);

      if (images.length === 1) {
        modalImageContainerWrapper.classList.add("single");
      } else {
        modalImageContainerWrapper.classList.remove("single");
      }

      setArrowVisibility();
    };

    if (modalThumbPrev) {
      modalThumbPrev.onclick = (event) => {
        event.preventDefault();
        if (!images.length) return;
        currentThumbIndex = (currentThumbIndex - 1 + images.length) % images.length;
        renderThumbnail();
      };
    }

    if (modalThumbNext) {
      modalThumbNext.onclick = (event) => {
        event.preventDefault();
        if (!images.length) return;
        currentThumbIndex = (currentThumbIndex + 1) % images.length;
        renderThumbnail();
      };
    }

    renderThumbnail();

    // staff contact info
    const staffContainer = document.getElementById("modal-staff");

    if (staffContainer) {
      const staffImage = staffContainer.querySelector(".staff-image");
      const staffName = staffContainer.querySelector(".staff-name");
      const staffPosition = staffContainer.querySelector(".staff-position");

      if (listing.staffContact.asset) {
        staffImage.innerHTML = `<img src="${listing.staffContact.asset}" alt="${listing.staffContact.name}" class="w-full h-full object-cover">`;
      } else {
        staffImage.style.display = "none";
      }

      staffName.textContent = listing.staffContact.name || "";

      if (listing.staffContact.position) {
        staffPosition.textContent = listing.staffContact.position;
        staffPosition.style.display = "";
      } else {
        staffPosition.style.display = "none";
      }
    }

    // call button
    const formatPhone = (phone) => {
      const digits = phone.replace(/\D/g, '');
      if (digits.length === 10) {
        return digits.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
      }
      return phone; // fallback
    };

    const callButton = document.querySelector(".call-button");
    if (callButton) {
      callButton.href = listing.staffContact.phone;
      callButton.querySelector('.label').textContent = formatPhone(listing.staffContact.phone);
    }

    // email button
    const emailButton = document.querySelector(".email-button");
    if (emailButton) {
      emailButton.setAttribute("data-id", listingId);
    }

    const modal = document.getElementById("modal");
    modal.classList.add("show");
    body.classList.add("no-scroll");
    updatePopupButtons();
  };

  // Open photo modal
  const openPhotoModal = (listing, startIndex) => {
    if (!photoModal || !photoModalImageContainer) {
      return;
    }

    photoModalImageContainer.innerHTML = ""; // Clear existing images
    activePhotoSlides = [];
    activePhotoIndex = 0;

    listing.images.forEach((imageHtml, index) => {
      const imageDiv = document.createElement("div");
      imageDiv.innerHTML = imageHtml;
      imageDiv.classList.add("photo-slide", "col-span-12", "lg:col-span-8", "flex", "justify-center");
      imageDiv.style.display = "none";
      photoModalImageContainer.appendChild(imageDiv);
    });

    activePhotoSlides = Array.from(
      photoModalImageContainer.querySelectorAll(".photo-slide")
    );
    activePhotoIndex = Math.min(
      Math.max(startIndex, 0),
      activePhotoSlides.length - 1
    );
    renderPhotoModalSlides();

    // Show photo modal
    photoModal.classList.add("show");
    const listingModal = document.getElementById("modal");
    if (!listingModal || !listingModal.classList.contains("show")) {
      body.classList.add("no-scroll");
    }
  };

  // Close modal
  const closeModal = (modalElement, shouldResetMap = false) => {
    if (!modalElement) {
      return;
    }

    modalElement.classList.remove("show");

    if (modalElement.id === "photo-modal") {
      const listingModal = document.getElementById("modal");
      if (!listingModal || !listingModal.classList.contains("show")) {
        body.classList.remove("no-scroll");
      }
      return;
    }

    body.classList.remove("no-scroll");
    nav.classList.remove("scrolled");

    currentOpenListingId = null;
    updatePopupButtons();
    isListingModalOpen = false;

    if (typeof map.closePopup === "function") {
      map.closePopup();
    }

    const photoModalEl = document.getElementById("photo-modal");
    if (photoModalEl) {
      photoModalEl.classList.remove("show");
      activePhotoSlides = [];
      activePhotoIndex = 0;
    }

    const activePopupEl = document.querySelector(
      ".custom-popup .tooltip-content"
    );
    if (activePopupEl) {
      const activeId = activePopupEl.getAttribute("data-id");
      const listing = mapData.listings.find(
        (l) => String(l.id) === String(activeId)
      );
      const layer = mapLayers[activeId];
      if (listing && layer) {
        layer.eachLayer((shape) => {
          if (shape.getPopup && shape.getPopup()) {
            shape.setPopupContent(getPopupContent(listing, activeId));
          }
        });
      }
    }
    setTimeout(() => {
      navState.allowNavScrollLogic = true;
    }, 500);

    if (shouldResetMap) {
      // Reset the map view to show all shapes
      map.flyToBounds(allBounds.getBounds(), {
        padding: [50, 50],
        duration: mapDuration,
      });
    }
  };

  // Initialize shapes on the maps for Land Sale and Land Ownership
  const initializeMapShapes = () => {
    if (mapData.listings && mapData.listings.length > 0) {
      // Land Sales Page Logic
      mapData.listings.forEach((listing) => {
        if (!listing.shapefile || listing.shapefile.length === 0) {
          console.warn(
            `No shapefiles found for listing: ${listing.title || listing.id}`
          );
          return;
        }

        listing.shapefile.forEach((shapefileUrl) => {
          processShapefile(shapefileUrl, listing.id);
        });
      });
    } else if (mapData.shapefiles && mapData.shapefiles.length > 0) {
      // Land Ownership Page Logic
      mapData.shapefiles.forEach((shapefileUrl) => {
        processShapefile(shapefileUrl);
      });
    } else {
      console.warn("No shapefiles or listings found in mapData.");
    }
  };

  const mapLayers = {}; // Store layers for each listing by ID

const processShapefile = (shapefileUrl, listingId = null) => {
  fetch(shapefileUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.arrayBuffer();
    })
    .then((arrayBuffer) => {
      return shapefile.open(arrayBuffer).then((source) => {
        source.read().then(function log(result) {
          if (result.done) {
            return;
          }

          const geojson = result.value;

          const layer = L.geoJSON(geojson, {
            style: {
              color: "red", // Default color
              weight: 2,
              fillOpacity: 0.2,
            },
            onEachFeature: (feature, layer) => {
              const listing = listingId
                ? mapData.listings.find((l) => l.id === listingId)
                : null;

              if (listing && listing.title) {
                const popupContent = getPopupContent(listing, listingId);

                layer.bindPopup(popupContent, {
                  className: "custom-popup",
                  closeButton: false,
                  offset: [0, -20],
                });

                // **Desktop Hover Behavior - Keep Popup Open on Hover**
                layer.on("mouseover", () => {
                  layer.setStyle({
                    color: "red",
                    weight: 3,
                    fillOpacity: 0.4,
                  });
                  if (window.matchMedia("(min-width: 1024px)").matches) {
                    layer.setPopupContent(getPopupContent(listing, listingId));
                    layer.openPopup();

                    // **Ensure popup stays open when hovered**
                    setTimeout(() => {
                      const popup = document.querySelector(".custom-popup");
                      if (popup) {
                        popup.addEventListener("mouseenter", () => {
                          layer.openPopup();
                        });

                        popup.addEventListener("mouseleave", () => {
                          layer.closePopup();
                        });
                      }
                      updatePopupButtons();
                    }, 300);
                  }
                });

                layer.on("mouseout", () => {
                  layer.setStyle({
                    color: "red",
                    weight: 2,
                    fillOpacity: 0.2,
                  });
                });

                // **Handle Click Behavior**
                layer.on("click", () => {
                  const isDesktop = window.matchMedia("(min-width: 1024px)").matches;

                  if (listingId) {
                    if (isDesktop) {
                      openModal(listingId); // Desktop opens modal immediately
                    } else {
                      layer.setPopupContent(getPopupContent(listing, listingId));
                      layer.openPopup(); // Mobile opens popup first
                      updatePopupButtons();
                      // Attach event listener to "Read More" after popup is opened
                      setTimeout(() => {
                        document.querySelectorAll(".read-more").forEach((btn) => {
                          btn.addEventListener("click", (e) => {
                            e.preventDefault();
                            const id = btn.getAttribute("data-id");
                            if (id) {
                              openModal(id);
                              layer.closePopup(); // Close popup when modal opens
                            }
                          });
                        });
                      }, 300);
                    }
                  }

                  // Zoom to shape
                  const bounds = layer.getBounds();
                  map.flyToBounds(bounds, {
                    paddingTopLeft: [150, 0],  
                    paddingBottomRight: [150, 50],
                    duration: mapDuration,
                  });
                });
              }
            },
          }).addTo(map);

          if (listingId) {
            mapLayers[listingId] = layer;
          }

          allBounds.addLayer(layer);
          source.read().then(log);
        });
      });
    })
    .catch((error) => {
      console.error("Error processing shapefile:", shapefileUrl, error);
    });
};
  
  
// ✅ Adjust initial zoom based on screen size AFTER all shapes have loaded
const adjustInitialView = () => {
    if (window.innerWidth < 768) {  
      // Below md breakpoint
        map.fitBounds(allBounds.getBounds(), {
            paddingTopLeft: [0, 30],  // Slightly push down
            paddingBottomRight: [0, 200],  // Give more space for listings
            maxZoom: 12,  // Set specific zoom for small screens
            duration: mapDuration,
        });
    } else if (window.innerWidth < 1024) {
        // Mobile: Offset the map upwards to show shapes in the top two-thirds
        map.fitBounds(allBounds.getBounds(), {
            paddingTopLeft: [0, 80], // Push map down by 1/3 of screen height
            paddingBottomRight: [0, 200], 
            duration: mapDuration,
        });
    } else {
        // Desktop: Default centered view
        map.fitBounds(allBounds.getBounds(), {
            padding: [5, 5], 
            duration: mapDuration,
        });
    }
};

// ✅ Run after all shapefiles are loaded
setTimeout(adjustInitialView, 500);

function adjustScrollForMap() {
    if (!mapWrapper) return;

    const mapRect = mapWrapper.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    // Only scroll if the bottom of mapWrapper is above the viewport bottom (user has scrolled past it)
    if (mapRect.bottom < windowHeight) {
        window.scrollBy({
            top: mapRect.bottom - windowHeight + 65, // Adjust as needed
            behavior: "smooth"
        });
    }
}

const attachButtonListeners = (selector, callback) => {
  const buttons = document.querySelectorAll(selector);

  buttons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const buttonElement = event.target.closest(selector);
      if (buttonElement) {
        const listingId = buttonElement.getAttribute("data-id");
        if (listingId) {
          const layer = mapLayers[listingId];

          if (layer) {
            const bounds = layer.getBounds();
            const isDesktop = window.matchMedia("(min-width: 1024px)").matches;

            if (isDesktop) {
              // **Desktop: Zoom to shape and open modal**
              map.flyToBounds(bounds, {
                padding: [70, 70],
                duration: mapDuration,
              });

              callback(listingId);
            } else {
              // **Mobile: Zoom to shape and show popup**
              map.flyToBounds(bounds, {
                paddingTopLeft: [150, 0],  
                paddingBottomRight: [150, 50],
                duration: mapDuration,
              });

              setTimeout(() => {
                // Explicitly open the popup with correct content (hide Read More if needed)
                const listing = mapData.listings.find((l) => l.id === listingId);
                layer.eachLayer((shape) => {
                  if (shape.getPopup()) {
                    shape.setPopupContent(getPopupContent(listing, listingId));
                    shape.openPopup();
                  }
                });
                updatePopupButtons();

                // **Ensure "Read More" in popup opens modal**
                setTimeout(() => {
                  document.querySelectorAll(".read-more").forEach((btn) => {
                    btn.addEventListener("click", (e) => {
                      e.preventDefault();
                      const id = btn.getAttribute("data-id");
                      if (id) {
                        callback(id);
                        layer.eachLayer((shape) => {
                          if (shape.getPopup()) {
                            shape.closePopup();
                          }
                        });
                      }
                    });
                  });
                }, 500);
              }, mapDuration * 1000);
            }
          } else {
            console.error(`Layer not found for listing ID ${listingId}`);
          }
        } else {
          console.error(`Listing ID not found on ${selector}`);
        }
      }
    });
  });
};
  attachButtonListeners(".view-button", (listingId) => openModal(listingId));
  attachButtonListeners(".image-button", (listingId) => openModal(listingId));

  // Add modal close listeners
  const closeButton = document.querySelector(".content-modal-close");
  if (closeButton) {
    closeButton.addEventListener("click", () =>
      closeModal(document.getElementById("modal"), true)
    );
  }

  const photoModalClose = document.querySelector(".photo-modal-close");
  if (photoModalClose) {
    photoModalClose.addEventListener("click", () =>
      closeModal(document.getElementById("photo-modal"))
    );
  }

  // Open contact modal for a specific listing
  const openContactModal = (listingId) => {
    const contactModal = document.getElementById(`contact-modal-${listingId}`);
    if (!contactModal) {
      console.error(`Contact modal for listing ID ${listingId} not found.`);
      return;
    }
    contactModal.classList.remove("pointer-events-none", "translate-y-full");
    body.classList.add("no-scroll");
  };

  // Close contact modal
  const closeContactModal = (listingId) => {
    const contactModal = document.getElementById(`contact-modal-${listingId}`);
    if (contactModal) {
      contactModal.classList.add("pointer-events-none", "translate-y-full");
      body.classList.remove("no-scroll");
    }
  };

  document.querySelectorAll(".email-button").forEach((button) => {
    button.addEventListener("click", (e) => {
      e.preventDefault();
      const listingId = button.getAttribute("data-id");

      if (listingId) {
        openContactModal(listingId);
      } else {
        console.error("Listing ID not found for email button.");
      }
    });
  });

  document.querySelectorAll(".contact-modal-close").forEach((button) => {
    button.addEventListener("click", () => {
      const listingId = button
        .closest("[id^='contact-modal-']")
        .id.replace("contact-modal-", "");
      if (listingId) {
        closeContactModal(listingId);
      } else {
        console.error("Listing ID not found for close button.");
      }
    });
  });

  initializeMapShapes();

  document.addEventListener("click", function (event) {
    const button = event.target.closest(".read-more");
    if (button) {
      event.preventDefault();
      const listingId = button.getAttribute("data-id");
      if (listingId) {
        const layer = mapLayers[listingId];

        if (layer) {
          const bounds = layer.getBounds();
          map.flyToBounds(bounds, {
            paddingTopLeft: [150, 0],
            paddingBottomRight: [150, 50],
            duration: mapDuration,
          });
        }

        if (typeof map.closePopup === 'function') map.closePopup();
        openModal(listingId);
      }
    }
  });
}
