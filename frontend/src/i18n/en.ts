/** Single source of UI copy. Keeps tone consistent across the app. */

export const en = {
  brand: 'Historical Trade Simulator',
  brandShort: 'HTS',
  disclaimer: 'Educational only. Not investment advice.',

  nav: {
    landing: 'Home',
    builder: 'Build scenario',
    saved: 'Saved scenarios',
    compare: 'Compare',
    methodology: 'Methodology',
  },

  cta: {
    primary: 'Run a sample scenario',
    secondary: 'Build your own',
    save: 'Save scenario',
    rerun: 'Re-run',
    duplicate: 'Duplicate',
    delete: 'Delete',
    compare: 'Compare',
    edit: 'Edit',
    runSimulation: 'Run simulation',
    seeFullSimulation: 'Run full simulation',
    explainChart: 'What does this mean?',
  },

  landing: {
    eyebrow: 'Educational simulator · Not investment advice',
    headline: 'See how that decision could have played out.',
    sub:
      'Replay any investment decision against real historical price data. One-time investment, monthly savings, or a basket of stocks — with a benchmark to compare against, every time.',

    /** Plain-English “What is this?” block, for non-finance users. */
    plain: {
      eyebrow: 'New to investing?',
      title: 'In one sentence: this app shows what would have happened if you invested back then.',
      body:
        'Pick a stock or ETF, pick a date, and tell us how much you would have invested. We replay history, day by day, and show you how that money would have grown — and how it would have compared to simply buying the S&P 500 (a popular benchmark for the U.S. stock market).',
    },

    howItWorks: {
      eyebrow: 'How it works',
      title: 'Three steps. No spreadsheets.',
      steps: [
        {
          title: 'Pick what you would have bought',
          body:
            'Choose one stock or ETF, or a basket of up to 10 weighted by your chosen percentages. Tickers like AAPL, MSFT, SPY are seeded for you.',
        },
        {
          title: 'Pick a date and an amount',
          body:
            'Anywhere from January 2010 to today. Drop in a one-time amount, or model adding the same amount every month or quarter (a strategy called dollar-cost averaging).',
        },
        {
          title: 'Read the story',
          body:
            'You get a final value, a growth chart, and the same numbers a portfolio analyst would look at — each with a plain-English explanation of what it means.',
        },
      ],
    },

    /** Glossary surfaced to landing for non-technical users. */
    glossary: {
      eyebrow: 'Words you might see',
      title: 'A pocket dictionary, in plain English.',
      sub: 'No jargon. Hover or tap any term in the app for the same definition.',
      terms: [
        {
          term: 'Total return',
          plain:
            'How much your money grew, in percent. +50% means you have 1.5× what you started with.',
          why: 'It’s the simplest answer to “did this work?”',
        },
        {
          term: 'CAGR',
          plain:
            'The smooth, average yearly growth rate. If your money grew 100% over 10 years, that’s about 7.2% per year compounded.',
          why: 'Lets you compare 3-year and 30-year results on the same scale.',
        },
        {
          term: 'Volatility',
          plain:
            'How bumpy the ride was. Higher volatility means bigger up-days and bigger down-days.',
          why: 'Two investments can land at the same value, but one might keep you up at night.',
        },
        {
          term: 'Max drawdown',
          plain:
            'The worst peak-to-bottom drop along the way. −40% means the portfolio fell 40% below its previous high before recovering.',
          why: 'It’s the “could you have stomached this?” number.',
        },
        {
          term: 'Benchmark',
          plain:
            'A standard portfolio you compare against. SPY tracks the S&P 500, the 500 largest U.S. companies.',
          why: 'Beating cash isn’t enough — could you have beaten just buying the index?',
        },
        {
          term: 'Dollar-cost averaging (DCA)',
          plain:
            'Investing the same amount on a schedule (e.g., $500 every month) instead of all at once.',
          why: 'Smooths out timing luck — sometimes wins, sometimes loses, but always boring on purpose.',
        },
        {
          term: 'Basket',
          plain:
            'A weighted mix of stocks, like 50% AAPL + 30% MSFT + 20% GOOGL.',
          why: 'Diversification — if one ticker tanks, the others still pull their weight.',
        },
        {
          term: 'Dividends reinvested',
          plain:
            'When a company pays you cash (a dividend), this setting buys more shares with it instead of taking it as cash.',
          why: 'Long-term, this can dramatically change the final number.',
        },
      ],
    },

    samples: {
      title: 'Try a sample',
      subtitle: 'One click — runs against seeded historical prices.',
    },
    valueProps: [
      {
        title: 'Lump sum or DCA',
        body:
          'Drop a single amount in or model recurring monthly / quarterly contributions over decades.',
      },
      {
        title: 'Basket portfolios',
        body:
          'Allocate weights across up to 10 securities. Weights snap to 100% with a one-click auto-balance.',
      },
      {
        title: 'Benchmark anything',
        body:
          'Compare against SPY, QQQ, VTI, IWM, or DIA — the same engine, the same deposit schedule.',
      },
      {
        title: 'CAGR, drawdown, volatility',
        body:
          'Every metric carries an "as of" date and links to a definition. Truth-first, marketing-second.',
      },
      {
        title: 'Save and compare',
        body:
          'Save a scenario, duplicate it with a different start date, then compare both side by side.',
      },
    ],
  },

  builder: {
    title: 'Scenario builder',
    eyebrow: 'Step by step',
    intro: {
      title: 'You’re going to do four small things.',
      body:
        'Pick what to buy, pick when, pick how much, and pick what to compare against. Live preview updates as you go — nothing is committed until you press “Run full simulation.”',
    },
    sections: {
      strategy: 'Strategy',
      positions: 'Position(s)',
      dates: 'Dates',
      investment: 'Investment',
      comparison: 'Comparison',
    },
    livePreview: {
      title: 'Live preview',
      hint: 'Updates as you type. Run the full simulation for charts and ledger.',
      empty: 'Pick a ticker to see a live preview.',
    },

    /** Field-level help: what it is, what it does, how it changes the result. */
    help: {
      name: {
        what: 'A label for this scenario, just for your own reference.',
        affect: 'Doesn’t change the math at all. Make it descriptive — “MSFT vs SPY since 2015”.',
      },
      mode: {
        what: 'Single position = one ticker. Basket = a mix of up to 10 tickers with weights.',
        affect:
          'Basket spreads the same money across multiple stocks. The result is the weighted blend of all of them.',
      },
      recurring: {
        what:
          'Add the same amount of money to your investment every month or quarter, in addition to the initial amount.',
        affect:
          'Recurring buys lower your timing risk: you buy more shares when prices are low, fewer when high. Most of the “final value” for long horizons comes from these contributions, not the initial sum.',
      },
      recurringAmount: {
        what: 'How much you add every interval.',
        affect: 'Bigger numbers compound into a much bigger final value over decades.',
      },
      symbol: {
        what: 'The stock or ETF you’re buying.',
        affect:
          'This is the biggest single driver of the result. Different tickers lived through wildly different decades.',
      },
      weight: {
        what: 'Percent of your money allocated to this position.',
        affect:
          'Weights must add up to 100%. Higher weight on a ticker means its returns dominate the portfolio.',
      },
      startDate: {
        what: 'The day you would have made the first purchase.',
        affect:
          'Earlier dates compound for longer. But starting just before a crash (e.g., 2008, 2020 spring) can permanently damage the result — that’s “timing risk.”',
      },
      endDate: {
        what: 'The day you stop. Often “today.”',
        affect: 'Longer windows let compounding work, but also include more crashes and recoveries.',
      },
      initialAmount: {
        what: 'How much you would have invested up front, on day one.',
        affect:
          'Final value scales linearly with this — double it and the final value roughly doubles. Percent metrics (CAGR, total return) are not affected.',
      },
      fees: {
        what: 'A flat percent the engine deducts from each buy, simulating commissions.',
        affect:
          'Most modern brokers are 0%. Even 1% per trade chips meaningfully off the final value over many trades.',
      },
      reinvest: {
        what: 'Use prices that already include dividend reinvestment (adjusted close).',
        affect:
          'When ON: dividends buy more shares automatically, compounding into the result. When OFF: dividends are not modeled. Long term, ON usually adds 1–3% per year for dividend-paying stocks.',
      },
      benchmark: {
        what:
          'A standard portfolio that runs through the exact same engine, with the same deposit schedule, so you have something to compare against.',
        affect:
          'Doesn’t change your portfolio at all — only the comparison numbers (vs benchmark, relative return).',
      },
    },
  },

  results: {
    eyebrowKpi: 'Headline metrics',
    eyebrowGrowth: 'Growth over time',
    eyebrowSecondary: 'Risk metrics',
    eyebrowDrawdown: 'Drawdown',
    eyebrowAnnual: 'Annual returns',
    eyebrowBasket: 'Basket breakdown',
    eyebrowLedger: 'Trade ledger',

    /** Per-KPI explainers. */
    explain: {
      finalValue: {
        what: 'What your investment would be worth on the end date.',
        read:
          'This is the bottom-line number. The chip below shows total dollars gained or lost vs. what you put in.',
      },
      totalReturn: {
        what: 'The percent your money grew between start and end.',
        read:
          '+100% means it doubled. +50% means it grew by half. Negative means you ended up with less than you put in.',
      },
      cagr: {
        what: 'Compound Annual Growth Rate — the smooth, average yearly return.',
        read:
          'A way to compare investments over different time periods. 10% CAGR means money roughly doubles every 7 years.',
      },
      vsBenchmark: {
        what: 'How many percentage points above (or below) the benchmark you ended up.',
        read:
          '+5pp means your scenario beat the benchmark by 5 percentage points of total return. Negative = it underperformed.',
      },
      volatility: {
        what: 'How much the daily returns swing around their average, scaled to a yearly number.',
        read:
          'Higher = bumpier ride. The S&P 500 historically sits around 15–20%. A single tech stock can be 30–50%.',
      },
      maxDrawdown: {
        what: 'The worst drop from a previous peak that you would have lived through.',
        read:
          'A −40% drawdown means at one point you were 40% below your high. Big drawdowns test your nerves more than your math.',
      },
      sharpe: {
        what: 'A simple risk-adjusted return: CAGR ÷ volatility.',
        read:
          'Higher is better. It rewards portfolios that earned their gains smoothly, and penalizes ones that took a wild ride to get there.',
      },
      latency: {
        what: 'How long the backend took to compute this entire simulation.',
        read: 'A performance signal, not a financial one. The engine targets sub-200ms for typical scenarios.',
      },
      growthChart: {
        what: 'Your portfolio’s value, plotted day by day, with the benchmark drawn alongside.',
        read:
          'When the lines spread apart, that’s where your scenario won or lost vs. just buying the benchmark. Hover for exact values.',
      },
      drawdownChart: {
        what: 'How far below the running peak the portfolio sat, on every day.',
        read:
          'Closer to zero is calmer. Big dips are bear markets and crashes you would have endured.',
      },
      annualChart: {
        what: 'The portfolio’s and benchmark’s return for each calendar year.',
        read:
          'Easy way to spot which years drove the result, and which years dragged it down.',
      },
      basketChart: {
        what: 'Approximate share each position contributed to the final value.',
        read:
          'Tells you which legs of the basket actually carried the result, and which were dead weight.',
      },
    },

    explainerCallout: {
      title: 'New to this? Here’s how to read this page.',
      body:
        'The four big numbers up top are the headline. The growth chart is the story. Everything below is the “but how risky was it?” detail. Tap the “?” next to any metric for a plain-English definition.',
    },
  },

  saved: {
    empty: {
      title: 'No saved scenarios yet',
      body: 'Your library starts here — build a scenario and save it to revisit later.',
    },
  },

  compare: {
    empty: {
      title: 'Pick two scenarios to compare',
      body: 'Select scenarios from the dropdowns above to see them side-by-side.',
    },
  },
};
