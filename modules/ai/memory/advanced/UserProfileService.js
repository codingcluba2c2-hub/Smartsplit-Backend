/**
 * UserProfileService
 * Manages explicit user preferences for the AI Assistant.
 */
class UserProfileService {
  constructor() {
    this.profiles = new Map(); // Map<userId, Profile>
  }

  async getProfile(userId) {
    // Mock database fetch for user AI preferences
    if (!this.profiles.has(userId)) {
      this.profiles.set(userId, {
        language: 'English',
        tone: 'Professional',
        responseLength: 'Medium',
        formattingPreference: 'Markdown with Tables'
      });
    }
    return this.profiles.get(userId);
  }

  async updateProfile(userId, updates) {
    const profile = await this.getProfile(userId);
    this.profiles.set(userId, { ...profile, ...updates });
    return this.profiles.get(userId);
  }
}

module.exports = new UserProfileService();