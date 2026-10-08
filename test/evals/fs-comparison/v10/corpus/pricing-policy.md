# Pricing boundaries and explicit arithmetic policy

Authored conditional design note for this experiment, not a universal standard.

Extracting a pure pricing function is valuable only if policy is explicit. Decimal parsing, precision, tax/discount order, rounding stage, currency scale and invalid-input outcomes are business contracts; a generic Money class does not decide them. Preserve caller-owned objects and ordering unless mutation is expressly required. Distinguish a browser estimate from a server-authoritative payable quote. Ask about authority before letting a client total govern a purchase, and keep transport errors separate from invalid pricing inputs. Validate example amounts against the selected order and rounding rule, including half-unit ties and rejected input. Do not invent multi-currency conversion, tax law, broad generics or a strategy hierarchy for hypothetical future policies.
