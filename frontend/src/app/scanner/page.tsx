"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";

import {
  getCurrentUser,
  type CurrentUser,
} from "../lib/auth";

import {
  getItemByBarcode,
  type ScannedItem,
} from "../lib/scanner";

const SCANNER_ELEMENT_ID =
  "stockpulse-barcode-reader";

type StockOperation =
  | "receive"
  | "issue"
  | "wastage"
  | "transfer"
  | "fefo";

export default function ScannerPage() {
  const scannerRef =
    useRef<Html5Qrcode | null>(null);

  const scanningRef =
    useRef(false);

  const [user, setUser] =
    useState<CurrentUser | null>(null);

  const [scannedBarcode, setScannedBarcode] =
    useState("");

  const [item, setItem] =
    useState<ScannedItem | null>(null);

  const [error, setError] =
    useState("");

  const [status, setStatus] =
    useState("Starting scanner...");

  const [isStarting, setIsStarting] =
    useState(true);

  /*
   * Start scanner after the component has mounted.
   *
   * IMPORTANT:
   * The scanner HTML element is always rendered below.
   * We therefore do not have the previous race condition
   * where React had not yet created the scanner element.
   */
  useEffect(() => {
    let cancelled = false;

    async function startScanner() {
      try {
        setStatus(
          "Checking authentication...",
        );

        const currentUser =
          await getCurrentUser();

        if (cancelled) {
          return;
        }

        setUser(currentUser);

        setStatus(
          "Preparing camera...",
        );

        /*
         * Give React one browser frame to make sure
         * the scanner element is mounted before
         * Html5Qrcode tries to use it.
         */
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            resolve();
          });
        });

        if (cancelled) {
          return;
        }

        const scannerElement =
          document.getElementById(
            SCANNER_ELEMENT_ID,
          );

        if (!scannerElement) {
          throw new Error(
            `Scanner element #${SCANNER_ELEMENT_ID} was not found on the page.`,
          );
        }

        /*
         * Prevent accidentally creating multiple
         * scanner instances.
         */
        if (scannerRef.current) {
          return;
        }

        const scanner =
          new Html5Qrcode(
            SCANNER_ELEMENT_ID,
          );

        scannerRef.current =
          scanner;

        setStatus(
          "Requesting camera access...",
        );

        await scanner.start(
          {
            facingMode: "environment",
          },
          {
            fps: 10,
            qrbox: {
              width: 280,
              height: 180,
            },
          },
          async (decodedText) => {
            /*
             * html5-qrcode can detect the same
             * barcode many times per second.
             *
             * This prevents duplicate API calls.
             */
            if (
              scanningRef.current
            ) {
              return;
            }

            scanningRef.current =
              true;

            setScannedBarcode(
              decodedText,
            );

            setError("");
            setItem(null);

            setStatus(
              "Barcode detected. Looking up item...",
            );

            try {
              const scannedItem =
                await getItemByBarcode(
                  currentUser.organization_id,
                  decodedText,
                );

              setItem(
                scannedItem,
              );

              setStatus(
                "Item found.",
              );
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : "Failed to look up barcode.",
              );

              setStatus(
                "Barcode detected, but item lookup failed.",
              );
            } finally {
              /*
               * Allow another scan after a short
               * delay.
               */
              window.setTimeout(() => {
                scanningRef.current =
                  false;
              }, 1500);
            }
          },
          () => {
            /*
             * html5-qrcode calls the failure callback
             * repeatedly while it is simply not seeing
             * a barcode.
             *
             * We intentionally do not display those
             * temporary scan failures.
             */
          },
        );

        if (!cancelled) {
          setStatus(
            "Camera ready. Point it at a barcode.",
          );

          setIsStarting(false);
        }
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "StockPulse camera startup error:",
          err,
        );

        let message =
          "Unable to start the camera.";

        if (err instanceof Error) {
          message = err.message;
        } else if (
          typeof err === "string"
        ) {
          message = err;
        } else {
          try {
            message =
              JSON.stringify(err);
          } catch {
            message =
              "Unable to start the camera.";
          }
        }

        setError(message);

        setStatus(
          "Camera could not be started.",
        );

        setIsStarting(false);
      }
    }

    startScanner();

    /*
     * Cleanup when leaving the page.
     */
    return () => {
      cancelled = true;

      const scanner =
        scannerRef.current;

      if (!scanner) {
        return;
      }

      const state =
        scanner.getState();

      if (
        state ===
        Html5QrcodeScannerState.SCANNING
      ) {
        scanner
          .stop()
          .catch(() => {
            /*
             * Ignore cleanup errors.
             */
          })
          .finally(() => {
            scanner.clear();
          });
      } else {
        try {
          scanner.clear();
        } catch {
          /*
           * Ignore cleanup errors.
           */
        }
      }

      scannerRef.current =
        null;
    };
  }, []);

  function clearResult() {
    setScannedBarcode("");
    setItem(null);
    setError("");

    if (scannerRef.current) {
      setStatus(
        "Camera ready. Point it at a barcode.",
      );
    } else {
      setStatus(
        "Preparing camera...",
      );
    }
  }

  function getStockOperationUrl(
    operation: StockOperation,
  ) {
    if (!item) {
      return "#";
    }

    return (
      `/stock-operations?itemId=${encodeURIComponent(
        item.id,
      )}&operation=${operation}`
    );
  }

  const canOperate =
    user?.role === "admin" ||
    user?.role === "staff";

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-3xl">
        {/* Page heading */}
        <h1 className="text-2xl font-bold">
          Barcode Scanner
        </h1>

        <p className="mt-2 text-gray-600">
          Scan an item barcode to find
          its StockPulse record.
        </p>

        {/* 
          IMPORTANT:
          This scanner container is ALWAYS rendered.
          
          This fixes the previous:
          "HTML Element ... not found"
          error.
        */}
        <div className="mt-6 overflow-hidden rounded-lg border bg-white">
          <div
            id={SCANNER_ELEMENT_ID}
            className="min-h-[320px]"
          />
        </div>

        {/* Scanner status */}
        <div className="mt-4 rounded-lg border bg-gray-50 p-4">
          <p className="text-sm font-medium">
            Scanner status
          </p>

          <p className="mt-1 text-sm text-gray-600">
            {status}
          </p>
        </div>

        {/* Initializing indicator */}
        {isStarting &&
          !error && (
            <div className="mt-4 rounded-lg border bg-white p-4">
              <p className="text-sm text-gray-600">
                Initializing camera and
                scanner...
              </p>
            </div>
          )}

        {/* Scanned barcode */}
        {scannedBarcode && (
          <div className="mt-4 rounded-lg border bg-white p-4">
            <p className="text-sm font-medium">
              Scanned barcode
            </p>

            <p className="mt-1 font-mono text-sm">
              {scannedBarcode}
            </p>
          </div>
        )}

        {/* Scanner / lookup error */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4">
            <p className="font-medium text-red-800">
              Scanner error
            </p>

            <p className="mt-1 break-words text-sm text-red-700">
              {error}
            </p>

            <button
              type="button"
              onClick={clearResult}
              className="mt-3 rounded-md border px-3 py-2 text-sm"
            >
              Clear Result
            </button>
          </div>
        )}

        {/* Item result */}
        {item && (
          <div className="mt-4 rounded-lg border bg-white p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500">
                  Item found
                </p>

                <h2 className="mt-1 text-xl font-semibold">
                  {item.name}
                </h2>
              </div>

              <button
                type="button"
                onClick={clearResult}
                className="rounded-md border px-3 py-2 text-sm"
              >
                Scan Again
              </button>
            </div>

            {/* Item information */}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-gray-500">
                  SKU
                </p>

                <p className="mt-1 font-medium">
                  {item.sku}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-gray-500">
                  Barcode
                </p>

                <p className="mt-1 font-mono text-sm">
                  {item.barcode ??
                    scannedBarcode}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-gray-500">
                  Unit
                </p>

                <p className="mt-1 font-medium">
                  {item.unit}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-gray-500">
                  Reorder Point
                </p>

                <p className="mt-1 font-medium">
                  {item.reorder_point}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-gray-500">
                  Reorder Quantity
                </p>

                <p className="mt-1 font-medium">
                  {item.reorder_quantity}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-gray-500">
                  Lead Time
                </p>

                <p className="mt-1 font-medium">
                  {item.lead_time_days}{" "}
                  days
                </p>
              </div>
            </div>

            {/* 
              Stock operation actions.
              
              These appear only after a valid
              item has been found.
            */}
            {canOperate && (
              <div className="mt-6 border-t pt-5">
                <p className="text-sm font-medium">
                  What would you like to
                  do with this item?
                </p>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <a
                    href={getStockOperationUrl(
                      "receive",
                    )}
                    className="rounded-lg border px-4 py-3 text-center font-medium hover:bg-gray-50"
                  >
                    Receive Stock
                  </a>

                  <a
                    href={getStockOperationUrl(
                      "issue",
                    )}
                    className="rounded-lg border px-4 py-3 text-center font-medium hover:bg-gray-50"
                  >
                    Issue Stock
                  </a>

                  <a
                    href={getStockOperationUrl(
                      "wastage",
                    )}
                    className="rounded-lg border px-4 py-3 text-center font-medium hover:bg-gray-50"
                  >
                    Record Wastage
                  </a>

                  <a
                    href={getStockOperationUrl(
                      "transfer",
                    )}
                    className="rounded-lg border px-4 py-3 text-center font-medium hover:bg-gray-50"
                  >
                    Transfer Stock
                  </a>

                  <a
                    href={getStockOperationUrl(
                      "fefo",
                    )}
                    className="rounded-lg border px-4 py-3 text-center font-medium hover:bg-gray-50 sm:col-span-2"
                  >
                    FEFO Issue
                  </a>
                </div>
              </div>
            )}

            {/* Viewer message */}
            {!canOperate && (
              <div className="mt-6 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                Your role can scan and
                view items but cannot
                perform stock operations.
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}