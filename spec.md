# Trading Risk Calculator – Product Spec

## 1. Overview

A web-based trading calculator designed to improve decision-making around leverage, position sizing, and risk management. The system prioritizes behavioral correctness over raw calculation.

---

## 2. Core Objectives

* Prevent over-leveraging
* Enforce consistent risk management (e.g. max 5% per trade)
* Provide real-world loss estimation (fees + slippage)
* Improve trade quality via RR and validation scoring
* Build a feedback loop via trade journaling

---

## 3. Core Inputs

* Entry Price
* Stop Loss (SL)
* Take Profit (TP) [optional]
* Account Size
* Risk % (slider)
* Leverage (slider)
* Fee % (configurable)
* Slippage % (configurable)

---

## 4. Core Features

### 4.1 Risk Reality Panel

Displays:

* Account loss ($ and %)
* Position loss (%)
* Liquidation distance
* Real loss (including fees + slippage)

Color coding:

* Green: < 2%
* Yellow: 2–5%
* Red: > 5%

---

### 4.2 Risk/Reward (RR) Calculator

* Calculates RR ratio
* Computes required win rate

Formula:

* RR = Reward / Risk
* Required Win Rate = 1 / (1 + RR)

---

### 4.3 Position Size Lock Mode

User sets max risk (e.g. 5%):

* System auto-calculates position size
* Leverage becomes derived output

Purpose:

* Remove emotional over-leveraging

---

### 4.4 Slippage & Fee Simulation

* Applies fee % and slippage % to entry/exit
* Outputs adjusted SL and actual loss

---

### 4.5 Drawdown Simulator

Simulates consecutive losses:

* Input: number of losses (e.g. 5–10)
* Output: remaining account balance

---

### 4.6 Dual Slider System

* Slider 1: Risk %
* Slider 2: Leverage

Dynamic updates:

* Position size
* Loss %
* Liquidation distance

Slider snapping:

* 5x, 10x, 15x, 20x

---

### 4.7 Trade Journal

Auto-log each calculation:

* Entry, SL, TP
* Risk %
* Leverage
* RR

Analytics:

* Avg RR
* Avg risk
* Win/loss tracking (manual input)

---

### 4.8 Trade Validation Score

Score (0–100) based on:

* Risk ≤ 5%
* RR ≥ 2
* SL distance reasonableness

Outputs:

* Score
* Feedback message (e.g. "Overleveraged", "Low edge trade")

---

### 4.9 Visual Risk Bar

Graphical representation:

* Entry
* Stop Loss
* Liquidation

Purpose:

* Improve intuitive understanding of risk

---

## 5. Advanced Features (Optional)

* Kelly Criterion suggestion
* Volatility-based SL suggestions
* Max leverage recommendation based on SL distance

---

## 6. Priority Implementation

### Phase 1 (MVP)

* Risk Reality Panel
* Position Size Lock
* RR Calculator
* Slippage & Fee Simulation

### Phase 2

* Dual Slider System
* Trade Validation Score
* Visual Risk Bar

### Phase 3

* Trade Journal
* Drawdown Simulator

### Phase 4

* Advanced features

---

## 7. Key Principles

* Always show *real risk*, not theoretical
* Default to safe behavior
* Minimize emotional decision-making
* Provide immediate visual feedback

---

## 8. Notes for Implementation

* Ensure all calculations update in real-time
* Maintain precision for small % differences
* Consider modular architecture for reuse (calculator engine as core module)
* Suitable for integration with web frontend (Vue/React)

---

End of Spec
