const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');
const logger = require('../../utils/logger');

const eventBuffers = new Map();
let overwatchActive = false;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('overwatch')
    .setDescription('Toggle live event feed for all servers'),
  cooldown: 0,
  aliases: ['ow'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;

    if (user.id !== config.ownerId) return;

    overwatchActive = !overwatchActive;

    const embed = new EmbedBuilder()
      .setColor(overwatchActive ? 0x00ff00 : 0xff0000)
      .setTitle(overwatchActive ? 'Overwatch Enabled' : 'Overwatch Disabled')
      .setDescription(overwatchActive
        ? 'Live event monitoring is now **active**. All server events will be relayed to you via DM.'
        : 'Live event monitoring has been **stopped**.')
      .addFields(
        { name: 'Status', value: overwatchActive ? '`ACTIVE`' : '`INACTIVE`', inline: true },
        { name: 'Events Tracked', value: overwatchActive ? 'Messages, Joins, Leaves, Bans, Kicks, Role Changes, Channel Changes, Voice' : 'None', inline: false }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};

function isOverwatchActive() {
  return overwatchActive;
}

module.exports.isOverwatchActive = isOverwatchActive;
