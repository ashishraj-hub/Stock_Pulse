"use client";

import { useEffect, useRef, useState } from "react";
import {
  Html5Qrcode,
  Html5QrcodeScannerState,
} from "html5-qrcode";

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
              window.setTimeout(() => {
                scanningRef.current =
                  false;
              }, 1500);
            }
          },
          () => {
            /*
             * Ignore repeated temporary
             * scan failures.
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

    return `/stock-operations?itemId=${encodeURIComponent(
      item.id,
    )}&operation=${operation}`;
  }

  const canOperate =
    user?.role === "admin" ||
    user?.role === "staff";

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="mb-8 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-400">
                StockPulse
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Barcode Scanner
              </h1>

              <p className="mt-2 text-slate-300">
                Scan an item barcode to find its StockPulse record.
              </p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Scanner
              </p>

              <p className="mt-1 font-bold text-white">
                Camera
              </p>

              <p className="mt-1 text-xs font-semibold text-cyan-300">
                {user?.role ?? "CHECKING"}
              </p>
            </div>
          </div>
        </header>

        {/* Camera */}
        <section className="overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-900 shadow-xl">
          <div className="border-b border-slate-700 px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-white">
                  Camera Scanner
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Point the rear camera at a barcode or QR code.
                </p>
              </div>

              <div className="rounded-full border border-cyan-500/30 bg-cyan-950 px-3 py-1 text-xs font-bold text-cyan-300">
                LIVE
              </div>
            </div>
          </div>

          <div className="bg-black p-3 sm:p-5">
            <div
              id={SCANNER_ELEMENT_ID}
              className="min-h-[320px] overflow-hidden rounded-xl bg-slate-950"
            />
          </div>
        </section>

        {/* Status */}
        <section className="mt-4 rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.7)]" />

            <div>
              <p className="text-sm font-bold text-white">
                Scanner status
              </p>

              <p className="mt-1 text-sm text-slate-400">
                {status}
              </p>
            </div>
          </div>
        </section>

        {/* Initializing */}
        {isStarting && !error && (
          <section className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-950/30 p-5">
            <p className="text-sm font-semibold text-amber-300">
              Initializing camera and scanner...
            </p>

            <p className="mt-1 text-xs text-amber-200/70">
              Allow camera access if your browser asks for permission.
            </p>
          </section>
        )}

        {/* Barcode */}
        {scannedBarcode && (
          <section className="mt-4 rounded-2xl border border-blue-500/30 bg-slate-900 p-5 shadow-lg">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Scanned barcode
            </p>

            <p className="mt-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-sm text-cyan-300">
              {scannedBarcode}
            </p>
          </section>
        )}

        {/* Error */}
        {error && (
          <section className="mt-4 rounded-2xl border border-red-500/40 bg-red-950/40 p-5">
            <p className="font-bold text-red-300">
              Scanner error
            </p>

            <p className="mt-2 break-words text-sm text-red-200">
              {error}
            </p>

            <button
              type="button"
              onClick={clearResult}
              className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-300 transition hover:bg-red-500/20"
            >
              Clear Result
            </button>
          </section>
        )}

        {/* Item result */}
        {item && (
          <section className="mt-4 rounded-2xl border border-emerald-500/30 bg-slate-900 p-6 shadow-xl">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-700 pb-5 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-400">
                  Item found
                </p>

                <h2 className="mt-1 text-2xl font-black text-white">
                  {item.name}
                </h2>
              </div>

              <button
                type="button"
                onClick={clearResult}
                className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-2.5 text-sm font-bold text-slate-200 transition hover:bg-slate-800"
              >
                Scan Again
              </button>
            </div>

            {/* Item information */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <InfoCard
                label="SKU"
                value={item.sku}
              />

              <InfoCard
                label="Barcode"
                value={
                  item.barcode ??
                  scannedBarcode
                }
                mono
              />

              <InfoCard
                label="Unit"
                value={item.unit}
              />

              <InfoCard
                label="Reorder Point"
                value={String(
                  item.reorder_point,
                )}
              />

              <InfoCard
                label="Reorder Quantity"
                value={String(
                  item.reorder_quantity,
                )}
              />

              <InfoCard
                label="Lead Time"
                value={`${item.lead_time_days} days`}
              />
            </div>

            {/* Operations */}
            {canOperate && (
              <div className="mt-7 border-t border-slate-700 pt-6">
                <p className="text-sm font-bold text-white">
                  What would you like to do?
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Receiving stock is handled through Purchase Orders.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <OperationLink
                    href="/purchase-orders"
                    label="Create Purchase Order"
                    accent="emerald"
                  />

                  <OperationLink
                    href={getStockOperationUrl(
                      "issue",
                    )}
                    label="Issue Stock"
                    accent="blue"
                  />

                  <OperationLink
                    href={getStockOperationUrl(
                      "wastage",
                    )}
                    label="Record Wastage"
                    accent="red"
                  />

                  <OperationLink
                    href={getStockOperationUrl(
                      "transfer",
                    )}
                    label="Transfer Stock"
                    accent="violet"
                  />

                  <OperationLink
                    href={getStockOperationUrl(
                      "fefo",
                    )}
                    label="FEFO Issue"
                    accent="amber"
                    fullWidth
                  />
                </div>
              </div>
            )}

            {/* Viewer */}
            {!canOperate && (
              <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950 p-4">
                <p className="text-sm font-semibold text-slate-300">
                  View-only access
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Your role can scan and view items but cannot perform stock operations.
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function InfoCard({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 break-words font-semibold text-white ${
          mono ? "font-mono text-sm text-cyan-300" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function OperationLink({
  href,
  label,
  accent,
  fullWidth = false,
}: {
  href: string;
  label: string;
  accent:
    | "emerald"
    | "blue"
    | "red"
    | "violet"
    | "amber";
  fullWidth?: boolean;
}) {
  const classes = {
    emerald:
      "border-emerald-500/30 bg-emerald-950/50 text-emerald-300 hover:bg-emerald-950",
    blue:
      "border-blue-500/30 bg-blue-950/50 text-blue-300 hover:bg-blue-950",
    red:
      "border-red-500/30 bg-red-950/50 text-red-300 hover:bg-red-950",
    violet:
      "border-violet-500/30 bg-violet-950/50 text-violet-300 hover:bg-violet-950",
    amber:
      "border-amber-500/30 bg-amber-950/50 text-amber-300 hover:bg-amber-950",
  };

  return (
    <a
      href={href}
      className={`rounded-xl border px-4 py-3.5 text-center text-sm font-bold transition ${classes[accent]} ${
        fullWidth ? "sm:col-span-2" : ""
      }`}
    >
      {label}
    </a>
  );
}