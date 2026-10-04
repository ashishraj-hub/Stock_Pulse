from datetime import date, timedelta
from uuid import UUID

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
        moving-average fallback
    - 7+ observations:
        Holt exponential smoothing

    Missing dates are treated as zero usage so that the model
    receives a continuous daily time series.
    """

    if forecast_days < 1 or forecast_days > 90:
        raise ValueError("forecast_days must be between 1 and 90")

    if not usage_history:
        raise ValueError("At least one usage-history record is required")

    history = pd.DataFrame(usage_history)

    history["date"] = pd.to_datetime(history["date"])
    history["quantity"] = pd.to_numeric(
        history["quantity"],
        errors="coerce",
    ).fillna(0)

    history = (
        history[["date", "quantity"]]
        .groupby("date", as_index=False)["quantity"]
        .sum()
        .sort_values("date")
    )

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

    average_daily_usage = float(quantities.mean())

    if len(quantities) < 3:
        raise ValueError(
            "At least 3 days of usage history are required for forecasting"
        )

    # ---------------------------------------------------------
    # Short history fallback
    # ---------------------------------------------------------
    #
    # With only a few observations, a sophisticated statistical
    # model can become unstable. We therefore use a weighted
    # recent average until enough history exists.
    #
    if len(quantities) < 7:
        recent_window = quantities.tail(min(3, len(quantities)))

        weights = pd.Series(
            range(1, len(recent_window) + 1),
            index=recent_window.index,
            dtype=float,
        )

        predicted_daily_usage = float(
            (recent_window * weights).sum() / weights.sum()
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

            forecast_values = fitted_model.forecast(
                forecast_days,
            )

            predicted_daily_usage = float(
                max(0, forecast_values.mean())
            )

            method = "holt"
            confidence = "medium"

        except Exception:
            # Statistical models can fail on unusual datasets.
            # The application should still provide a safe
            # baseline instead of failing completely.
            predicted_daily_usage = float(
                quantities.tail(min(7, len(quantities))).mean()
            )

            method = "moving_average_fallback"
            confidence = "low"

    # ---------------------------------------------------------
    # Generate future daily predictions
    # ---------------------------------------------------------

    last_date = history.index[-1]

    forecast = []

    for offset in range(1, forecast_days + 1):
        forecast_date = last_date + timedelta(days=offset)

        if method == "holt":
            # Recalculate the model forecast so each future
            # date gets its corresponding prediction.
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

                future_values = fitted_model.forecast(
                    forecast_days,
                )

                value = float(
                    max(0, future_values.iloc[offset - 1])
                )

            except Exception:
                value = predicted_daily_usage

        else:
            value = predicted_daily_usage

        forecast.append(
            {
                "date": forecast_date.date(),
                "predicted_quantity": round(value, 2),
            }
        )

    return ForecastResult(
        average_daily_usage=round(
            average_daily_usage,
            2,
        ),
        predicted_daily_usage=round(
            predicted_daily_usage,
            2,
        ),
        forecast=forecast,
        method=method,
        confidence=confidence,
    )