type TokenUsageDelegate = {
  create(args: {
    data: {
      userId: string;
      feature: string;
      promptSlug?: string | null;
      imagesSent: number;
      tokensSpent: number;
    };
  }): Promise<{ id: string; tokensSpent: number }>;
};

export function createTokenUsageRepository(delegate: TokenUsageDelegate) {
  return {
    create(data: {
      userId: string;
      feature: string;
      promptSlug?: string | null;
      imagesSent: number;
      tokensSpent: number;
    }) {
      return delegate.create({ data });
    },
  };
}