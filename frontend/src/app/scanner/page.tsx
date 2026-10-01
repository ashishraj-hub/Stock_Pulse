"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";

import { getCurrentUser, type CurrentUser } from "../lib/auth";
import { getItemByBarcode, type ScannedItem } from "../lib/scanner";

const SCANNER_ELEMENT_ID = "stockpulse-barcode-reader";

export default function ScannerPage() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanningRef = useRef(false);

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [item, setItem] = useState<ScannedItem | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Starting camera...");
  const [isStarting, setIsStarting] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function startScanner() {
      try {
        const currentUser = await getCurrentUser();

        if (cancelled) {
          return;
        }

        setUser(currentUser);

        const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);

        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: {
              width: 280,
              height: 180,
            },
          },
          async (decodedText) => {
            if (scanningRef.current) {
              return;
            }

            scanningRef.current = true;

            setScannedBarcode(decodedText);
            setError("");
            setItem(null);
            setStatus("Barcode detected. Looking up item...");

            try {
              const scannedItem = await getItemByBarcode(
                currentUser.organization_id,
                decodedText,
              );

              setItem(scannedItem);
              setStatus("Item found.");
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : "Failed to look up barcode.",
              );
              setStatus("Barcode detected, but item lookup failed.");
            } finally {
              setTimeout(() => {
                scanningRef.current = false;
              }, 1500);
            }
          },
          () => {
            // html5-qrcode calls this repeatedly while no barcode is detected.
            // We intentionally do not show those temporary scan failures.
          },
        );

        if (!cancelled) {
          setStatus("Camera ready. Point it at a barcode.");
          setIsStarting(false);
        }
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to start the camera.",
        );
        setStatus("Camera could not be started.");
        setIsStarting(false);
      }
    }

    startScanner();

    return () => {
      cancelled = true;

      const scanner = scannerRef.current;

      if (
        scanner &&
        scanner.getState() === Html5QrcodeScannerState.SCANNING
      ) {
        scanner
          .stop()
          .catch(() => {
            // Ignore cleanup errors when leaving the page.
          })
          .finally(() => {
            scanner.clear();
          });
      }

      scannerRef.current = null;
    };
  }, []);

  function clearResult() {
    setScannedBarcode("");
    setItem(null);
    setError("");
    setStatus("Camera ready. Point it at a barcode.");
  }

  if (!user && isStarting && !error) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-2xl font-bold">Barcode Scanner</h1>
        <p className="mt-2 text-gray-600">
          Starting scanner...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold">
          Barcode Scanner
        </h1>

        <p className="mt-2 text-gray-600">
          Scan an item barcode to find its StockPulse record.
        </p>

        <div className="mt-6 overflow-hidden rounded-lg border bg-white">
          <div
            id={SCANNER_ELEMENT_ID}
            className="min-h-[320px]"
          />
        </div>

        <div className="mt-4 rounded-lg border bg-gray-50 p-4">
          <p className="text-sm font-medium">
            Scanner status
          </p>

          <p className="mt-1 text-sm text-gray-600">
            {status}
          </p>
        </div>

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

        {error && (
          <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4">
            <p className="font-medium text-red-800">
              Lookup error
            </p>

            <p className="mt-1 text-sm text-red-700">
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
                  {item.barcode ?? scannedBarcode}
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
                  {item.lead_time_days} days
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}