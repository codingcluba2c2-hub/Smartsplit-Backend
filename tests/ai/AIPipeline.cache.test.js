const SemanticCacheService = require('../../modules/ai/cache/SemanticCacheService');

describe('Enterprise Cache Management Architecture', () => {
  it('should explicitly bypass Semantic Cache for Live Business Data', async () => {
    // Attempting to query an expense (Live Data)
    const result = await SemanticCacheService.checkCache({
      normalizedText: 'how much does rahul owe me',
      intent: 'Database'
    });
    
    expect(result.hit).toBe(false);
    expect(result.skipReason).toBe('Dynamic Business Data (Live DB Read)');
  });

  it('should utilize Semantic Cache for Knowledge queries', async () => {
    // Attempting to query Knowledge Base
    const result = await SemanticCacheService.checkCache({
      normalizedText: 'what is the expense policy',
      intent: 'Knowledge'
    });
    
    // In test environment, DB is empty, so it will miss, but shouldn't be skipped for rules.
    expect(result.hit).toBe(false);
    expect(result.skipReason).toBeUndefined();
  });

  it('should explicitly refuse to store Live Business Data responses in Semantic Cache', async () => {
    const consoleSpy = jest.spyOn(console, 'log');
    
    await SemanticCacheService.storeResponse(
      { normalizedText: 'owes me 50', intent: 'Database' },
      { response: 'He owes 50' }
    );
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Refusing to cache LIVE data intent: Database')
    );
    
    consoleSpy.mockRestore();
  });
});
