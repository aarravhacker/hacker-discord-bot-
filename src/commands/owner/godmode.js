const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config');
const { getDB } = require('../../db/connection');

const godmodeUsers = new Set();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('godmode')
    .setDescription('Toggle godmode - bypass all permission checks'),
  cooldown: 0,
  aliases: ['gm', 'god'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;

    if (user.id !== config.ownerId) return;

    const isActive = godmodeUsers.has(user.id);

    if (isActive) {
      godmodeUsers.delete(user.id);
    } else {
      godmodeUsers.add(user.id);
    }

    const embed = new EmbedBuilder()
      .setColor(isActive ? 0xff0000 : 0x00ff00)
      .setTitle(isActive ? 'Godmode Disabled' : 'Godmode Enabled')
      .setDescription(isActive
        ? 'You are no longer in godmode. Normal permission checks apply.'
        : 'You are now in **godmode**. All permission checks are bypassed.')
      .addFields(
        { name: 'Status', value: isActive ? '`OFF`' : '`ON`', inline: true },
        { name: 'Bypasses', value: isActive ? 'None' : 'All permission checks, command restrictions, cooldowns', inline: false }
      )
      .setFooter({ text: 'Godmode is session-only and resets on restart' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};

function isGodmode(userId) {
  return godmodeUsers.has(userId);
}

module.exports.isGodmode = isGodmode;
