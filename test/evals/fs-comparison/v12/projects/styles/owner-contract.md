# Supplied team decision
This project explicitly adopts our JSX-direct static utility policy for Button only.
It also adopts CVA for Button's two public variant axes size and tone, while preserving
the exact existing class strings, required props, onClick, type=button and focus style.
Adding class-variance-authority is authorized in the eventual plan. It is not installed yet.
Indicator's simple boolean opacity toggle is excluded from CVA conversion.
Tailwind itself permits complete class-string maps; describe our preference as team policy.
Keep the current palette. Whether semantic theme tokens should be introduced is undecided;
ask about that decision if the proposed plan depends on it. Do not add dark mode or rebrand.
Keep selected ticket ownership in the existing store and cleanup via its unsubscribe.
No implementation or approval is authorized in this exercise.
