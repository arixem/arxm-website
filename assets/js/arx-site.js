/*
 * arx-site.js
 *
 * Reemplaza a theme.min.js (tema de terceros minificado) para el sitio
 * reconstruido con el diseño nuevo. Sólo cubre lo que el markup actual
 * usa de verdad: interacciones de menú (sidebar móvil, meanmenu, sticky
 * header), año del footer, ocultar el loader inicial y el envío del
 * formulario de contacto.
 *
 * Dependencias: jQuery (assets/js/vendor/jquery-3.6.2.min.js) y
 * jquery.meanmenu.js, cargados antes que este archivo.
 */
(function () {
    "use strict";

    function bindMenuInteractions() {
        if (!window.jQuery) {
            return;
        }

        var $ = window.jQuery;

        $(".nav-btn a i")
            .off("click.arxSite")
            .on("click.arxSite", function (event) {
                event.preventDefault();
                $(".xs-sidebar-group").addClass("isActive");
            });

        $(".xs-overlay, .close-side-widget")
            .off("click.arxSite")
            .on("click.arxSite", function (event) {
                event.preventDefault();
                $(".xs-sidebar-group").removeClass("isActive");
            });

        var $mobileMenu = $(".mobile-menu nav");
        if ($.fn.meanmenu && $mobileMenu.length && !$(".mean-container").length) {
            $mobileMenu.meanmenu({
                meanScreenWidth: "991",
                meanMenuContainer: ".mobile-menu",
                meanMenuOpen: "<span></span> <span></span> <span></span>",
                onePage: false,
            });
        }

        var $stickyHeader = $("#sticky-header");
        if ($stickyHeader.length) {
            $(window)
                .off("scroll.arxSite")
                .on("scroll.arxSite", function () {
                    if ($(window).scrollTop() < 100) {
                        $stickyHeader.removeClass("sticky");
                    } else {
                        $stickyHeader.addClass("sticky");
                    }
                })
                .trigger("scroll.arxSite");
        }
    }

    function bindFooterYear() {
        var year = document.getElementById("year");
        if (year) {
            year.textContent = new Date().getFullYear();
        }
    }

    function hideLoader() {
        if (window.jQuery) {
            window.jQuery(".loader_bg").fadeOut();
        }
    }

    function isValidEmail(value) {
        return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
    }

    function bindContactForm() {
        var form = document.getElementById("contact-form");
        if (!form) {
            return;
        }

        var statusBox = document.getElementById("status");
        var submitBtn = form.querySelector('button[type="submit"]');
        var submitLabel = submitBtn ? submitBtn.innerHTML : "";

        function showAlert(type, message) {
            if (!statusBox) {
                return;
            }
            statusBox.innerHTML =
                '<div class="alert alert-' +
                type +
                '" role="alert">' +
                message +
                "</div>";
        }

        form.addEventListener("submit", function (event) {
            event.preventDefault();

            var data = new FormData(form);
            var payload = {
                name: (data.get("name") || "").toString(),
                email: (data.get("email") || "").toString(),
                company: (data.get("company") || "").toString(),
                phone: (data.get("phone") || "").toString(),
                area: (data.get("area") || "").toString(),
                situation: (data.get("situation") || "").toString(),
                has_data_sources: (data.get("has_data_sources") || "").toString(),
                message: (data.get("message") || "").toString(),
            };

            if (!isValidEmail(payload.email)) {
                showAlert("danger", "El correo electrónico es inválido.");
                return;
            }

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML =
                    'Enviando… <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
            }

            fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })
                .then(function (response) {
                    return response
                        .json()
                        .catch(function () {
                            return {};
                        })
                        .then(function (body) {
                            return { ok: response.ok, body: body };
                        });
                })
                .then(function (result) {
                    if (result.ok) {
                        showAlert(
                            "success",
                            (result.body && result.body.message) ||
                                "Mensaje enviado correctamente. Te contactaremos pronto."
                        );
                        form.reset();
                    } else {
                        showAlert(
                            "danger",
                            (result.body && result.body.message) ||
                                "Ocurrió un error al enviar el mensaje. Intenta de nuevo."
                        );
                    }
                })
                .catch(function () {
                    showAlert("danger", "Ocurrió un error al enviar el mensaje. Intenta de nuevo.");
                })
                .finally(function () {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = submitLabel;
                    }
                });
        });
    }

    function init() {
        bindMenuInteractions();
        bindFooterYear();
        bindContactForm();
        hideLoader();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
