const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

const chaosMode = { active: false, guilds: new Set() };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('chaos')
    .setDescription('Toggle chaos/fun testing mode')
    .addStringOption(opt => opt.setName('mode').setDescription('Mode: toggle, status')),
  cooldown: 0,
  aliases: ['ch'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;

    if (user.id !== config.ownerId) return;

    const mode = isSlash ? interaction.options?.getString('mode') : args?.[0];

    if (mode === 'status') {
      return interaction.reply({ embeds: [
        new EmbedBuilder()
          .setColor(chaosMode.active ? 0xff6600 : 0x5865f2)
          .setTitle('Chaos Mode Status')
          .setDescription(chaosMode.active ? '**ACTIVE** - Fun testing mode is ON' : '**INACTIVE** - Normal mode')
          .addFields(
            { name: 'Active Guilds', value: chaosMode.guilds.size > 0 ? Array.from(chaosMode.guilds).map(id => `<${id}>`).join(', ') : 'None', inline: false }
          )
          .setTimestamp()
      ] });
    }

    chaosMode.active = !chaosMode.active;

    if (chaosMode.active && interaction.guild) {
      chaosMode.guilds.add(interaction.guild.id);
    }

    const embed = new EmbedBuilder()
      .setColor(chaosMode.active ? 0xff6600 : 0x5865f2)
      .setTitle(chaosMode.active ? 'Chaos Mode ENABLED' : 'Chaos Mode DISABLED')
      .setDescription(chaosMode.active
        ? '**CHAOS MODE ACTIVE**\n\nFun testing mode is now ON.\nRandom reactions, funny responses, and playful behavior enabled.'
        : 'Chaos mode deactivated. Normal behavior restored.')
      .addFields(
        { name: 'Status', value: chaosMode.active ? '`ACTIVE`' : '`INACTIVE`', inline: true },
        { name: 'Scope', value: chaosMode.active ? 'This guild' : 'None', inline: true }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};

function isChaosActive(guildId) {
  return chaosMode.active && chaosMode.guilds.has(guildId);
}

module.exports.isChaosActive = isChaosActive;
