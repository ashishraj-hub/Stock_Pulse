from datetime import timedelta

import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing


class ForecastResult:
    def __init__(
        self,
        *,
        average_daily_usage: float,
        predicted_daily_usage: float,
        forecast: list[dict],
        method: str,
        confidence: str,
    ):
        self.average_daily_usage = average_daily_usage
        self.predicted_daily_usage = predicted_daily_usage
        self.forecast = forecast
        self.method = method
        self.confidence = confidence


def build_forecast(
    *,
    usage_history: list[dict],
    forecast_days: int,
) -> ForecastResult:
    """
    Build a short-term demand forecast from daily usage history.

    Strategy:
    - 0-2 historical observations:
        insufficient history
    - 3-6 observations:
        weighted moving-average fallback
    - 7+ observations:
        Holt exponential smoothing
    - If Holt fails:
        moving-average fallback

    Missing dates are treated as zero usage so the model
    receives a continuous daily time series.
    """

    if forecast_days < 1 or forecast_days > 90:
        raise ValueError(
            "forecast_days must be between 1 and 90"
        )

    if not usage_history:
        raise ValueError(
            "At least one usage-history record is required"
        )

    # ---------------------------------------------------------
    # Build normalized daily history
    # ---------------------------------------------------------

    history = pd.DataFrame(usage_history)

    history["date"] = pd.to_datetime(
        history["date"],
        errors="coerce",
    )

    history["quantity"] = pd.to_numeric(
        history["quantity"],
        errors="coerce",
    ).fillna(0)

    history = history.dropna(
        subset=["date"],
    )

    if history.empty:
        raise ValueError(
            "At least one valid usage-history record is required"
        )

    history = (
        history[["date", "quantity"]]
        .groupby("date", as_index=False)["quantity"]
        .sum()
        .sort_values("date")
    )

    # ---------------------------------------------------------
    # Fill missing calendar dates with zero usage
    # ---------------------------------------------------------

    start_date = history["date"].min()
    end_date = history["date"].max()

    full_dates = pd.date_range(
        start=start_date,
        end=end_date,
        freq="D",
    )

    history = (
        history.set_index("date")
        .reindex(full_dates, fill_value=0)
    )

    history.index.name = "date"

    quantities = history["quantity"].astype(float)

    average_daily_usage = float(
        quantities.mean()
    )

    if len(quantities) < 3:
        raise ValueError(
            "At least 3 days of usage history are required "
            "for forecasting"
        )

    # ---------------------------------------------------------
    # Variables used by both forecasting paths
    # ---------------------------------------------------------

    predicted_daily_usage = 0.0
    forecast_values = None
    method = ""
    confidence = ""

    # ---------------------------------------------------------
    # Short-history fallback
    # ---------------------------------------------------------
    #
    # With only a few observations, Holt smoothing can become
    # unstable. Use a weighted recent average instead.
    #
    if len(quantities) < 7:
        recent_window = quantities.tail(
            min(3, len(quantities))
        )

        weights = pd.Series(
            range(
                1,
                len(recent_window) + 1,
            ),
            index=recent_window.index,
            dtype=float,
        )

        predicted_daily_usage = float(
            (
                recent_window * weights
            ).sum()
            / weights.sum()
        )

        method = "weighted_moving_average"
        confidence = "low"

    # ---------------------------------------------------------
    # Holt exponential smoothing
    # ---------------------------------------------------------
    else:
        try:
            model = ExponentialSmoothing(
                quantities,
                trend="add",
                damped_trend=True,
                initialization_method="estimated",
            )

            fitted_model = model.fit(
                optimized=True,
            )

            # Fit the model ONCE and generate the complete
            # requested forecast in a single operation.
            forecast_values = fitted_model.forecast(
                forecast_days,
            )

            forecast_values = pd.Series(
                forecast_values,
            ).clip(
                lower=0,
            )

            predicted_daily_usage = float(
                forecast_values.mean()
            )

            method = "holt"
            confidence = "medium"

        except Exception:
            predicted_daily_usage = float(
                quantities.tail(
                    min(7, len(quantities))
                ).mean()
            )

            method = "moving_average_fallback"
            confidence = "low"

    # ---------------------------------------------------------
    # Generate future daily predictions
    # ---------------------------------------------------------

    last_date = history.index[-1]

    forecast = []

    for offset in range(
        1,
        forecast_days + 1,
    ):
        forecast_date = (
            last_date
            + timedelta(days=offset)
        )

        if (
            method == "holt"
            and forecast_values is not None
            and len(forecast_values) >= offset
        ):
            value = float(
                forecast_values.iloc[offset - 1]
            )
        else:
            value = predicted_daily_usage

        forecast.append(
            {
                "date": forecast_date.date(),
                "predicted_quantity": round(
                    max(0, value),
                    2,
                ),
            }
        )

    # ---------------------------------------------------------
    # Return normalized forecast result
    # ---------------------------------------------------------

    return ForecastResult(
        average_daily_usage=round(
            average_daily_usage,
            2,
        ),
        predicted_daily_usage=round(
            max(0, predicted_daily_usage),
            2,
        ),
        forecast=forecast,
        method=method,
        confidence=confidence,
    )