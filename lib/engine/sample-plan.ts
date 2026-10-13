import type { PlanInput } from "./schema";

/** A fictional example plan starting October 2026, used by the seed script and the tests. */
export const samplePlan: PlanInput = {
  "schemaVersion": 2,
  "baseMonth": "2026-10",
  "horizon": "2036-09",
  "income": {
    "inHand": 110000,
    "raisePct": 8,
    "raiseMonth": 4,
    "events": []
  },
  "expenses": [
    {
      "id": "rent",
      "name": "Rent",
      "amount": 18000,
      "inflate": true,
      "changes": []
    },
    {
      "id": "utilities",
      "name": "Electricity and water",
      "amount": 3500,
      "inflate": true,
      "changes": []
    },
    {
      "id": "living",
      "name": "Groceries and living costs",
      "amount": 16000,
      "inflate": true,
      "changes": []
    },
    {
      "id": "family",
      "name": "Family support",
      "amount": 15000,
      "inflate": true,
      "changes": [
        {
          "month": "2027-04",
          "amount": 10000
        }
      ]
    },
    {
      "id": "term",
      "name": "Term insurance (₹1.5 Cr)",
      "amount": 2200,
      "inflate": false,
      "changes": []
    },
    {
      "id": "health",
      "name": "Family health insurance",
      "amount": 2000,
      "inflate": true,
      "changes": []
    },
    {
      "id": "net",
      "name": "Internet and phones",
      "amount": 2500,
      "inflate": true,
      "changes": []
    },
    {
      "id": "car",
      "name": "Car EMI",
      "amount": 11000,
      "inflate": false,
      "end": "2028-03",
      "changes": []
    },
    {
      "id": "loan",
      "name": "Personal loan EMI",
      "amount": 4000,
      "inflate": false,
      "end": "2027-08",
      "changes": []
    },
    {
      "id": "cc",
      "name": "Credit card instalments",
      "amount": 2500,
      "inflate": false,
      "end": "2026-12",
      "changes": []
    }
  ],
  "commitments": [
    {
      "id": "child",
      "name": "Child education endowment plan",
      "amount": 5000,
      "end": "2036-08",
      "stepUp": 0,
      "cap": 0,
      "rate": 6,
      "goal": "kids",
      "protected": true,
      "note": "Guaranteed payout at maturity. Keep on autopay."
    },
    {
      "id": "ulip",
      "name": "Retirement ULIP",
      "amount": 8000,
      "end": "2036-08",
      "stepUp": 0,
      "cap": 0,
      "rate": 7,
      "goal": "ret",
      "protected": true,
      "note": "Market-linked. Avoid stopping in the first 5 years."
    },
    {
      "id": "ppf",
      "name": "PPF",
      "amount": 5000,
      "stepUp": 10,
      "cap": 12500,
      "rate": 7.1,
      "goal": "ret",
      "note": "Deposit before the 5th of each month."
    }
  ],
  "oneTimes": [
    {
      "id": "laptop",
      "name": "New laptop",
      "month": "2027-09",
      "amount": 40000
    }
  ],
  "emergency": {
    "target": 400000,
    "mode": "amount",
    "funds": "Savings account + one liquid fund"
  },
  "goals": [
    {
      "id": "house",
      "name": "House: 2BHK",
      "kind": "house",
      "share": 60,
      "targetDate": "2036-09",
      "debtYears": 3,
      "onTarget": "withdraw",
      "funds": [
        {
          "name": "Nifty 50 index fund",
          "pct": 50
        },
        {
          "name": "Nifty Next 50 index fund",
          "pct": 35
        },
        {
          "name": "Gold ETF fund of fund",
          "pct": 15
        }
      ],
      "house": {
        "priceToday": 8000000,
        "growth": 6,
        "downPct": 20,
        "costsPct": 10,
        "loanRate": 8.5,
        "loanYears": 25,
        "replacesExpenseId": "rent"
      }
    },
    {
      "id": "ret",
      "name": "Retirement",
      "kind": "invest",
      "share": 40,
      "onTarget": "hold",
      "funds": [
        {
          "name": "Nifty 50 index fund (separate \"Retirement\" SIP)",
          "pct": 75
        },
        {
          "name": "Nasdaq 100 fund of fund",
          "pct": 25
        }
      ]
    },
    {
      "id": "kids",
      "name": "Child's education",
      "kind": "invest",
      "share": 0,
      "onTarget": "hold",
      "funds": []
    }
  ],
  "assume": {
    "inflation": 6,
    "equityRet": 11,
    "debtRet": 7,
    "liquidRet": 6.5,
    "buffer": 7000
  },
  "start": {
    "ef": 0,
    "goals": {
      "house": 0,
      "ret": 0,
      "kids": 0
    },
    "commit": {
      "child": 10000,
      "ulip": 15000,
      "ppf": 0
    }
  }
};
