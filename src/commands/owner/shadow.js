const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');
const logger = require('../../utils/logger');

const shadowLogs = [];
const shadowActive = { active: false, channels: new Set() };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shadow')
    .setDescription('Toggle invisible logging mode')
    .addStringOption(opt => opt.setName('action').setDescription('Action: toggle, logs, clear')),
  cooldown: 0,
  aliases: ['sh'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;

    if (user.id !== config.ownerId) return;

    const action = isSlash ? interaction.options?.getString('action') : args?.[0];

    if (action === 'logs') {
      if (!shadowLogs.length) {
        return interaction.reply({ embeds: [
          new EmbedBuilder().setColor(0x5865f2).setTitle('Shadow Logs').setDescription('No shadow logs recorded.')
        ] });
      }

      const recent = shadowLogs.slice(-20);
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`Shadow Logs (Last ${recent.length})`)
        .setDescription(recent.map(l => `\`[${l.time}]\` ${l.event}: ${l.detail}`).join('\n'))
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'clear') {
      shadowLogs.length = 0;
      return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0x00ff00).setTitle('Cleared').setDescription('Shadow logs cleared.')
      ] });
    }

    shadowActive.active = !shadowActive.active;

    const embed = new EmbedBuilder()
      .setColor(shadowActive.active ? 0x000000 : 0xff0000)
      .setTitle(shadowActive.active ? 'Shadow Mode Enabled' : 'Shadow Mode Disabled')
      .setDescription(shadowActive.active
        ? '**Shadow mode is now active.**\nAll bot events are being logged silently. No output will be sent to channels.'
        : 'Shadow mode deactivated. Normal logging resumed.')
      .addFields(
        { name: 'Status', value: shadowActive.active ? '`SHADOW ON`' : '`SHADOW OFF`', inline: true },
        { name: 'Logs Recorded', value: `\`${shadowLogs.length}\``, inline: true }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};

function logShadow(event, detail) {
  if (!shadowActive.active) return;
  shadowLogs.push({
    event,
    detail: detail.substring(0, 200),
    time: new Date().toLocaleTimeString()
  });
  if (shadowLogs.length > 100) shadowLogs.shift();
}

function isShadowActive() {
  return shadowActive.active;
}

module.exports.logShadow = logShadow;
module.exports.isShadowActive = isShadowActive;
