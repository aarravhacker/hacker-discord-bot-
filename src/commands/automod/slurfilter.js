const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { embedColors } = require('../../config');
const { getDB } = require('../../db/connection');

const DEFAULT_SLURS = [
  'nigger', 'nigga', 'faggot', 'fag', 'retard', 'retarded', 'spic', 'chink',
  'kike', 'dyke', 'tranny', 'shemale', 'wetback', 'beaner', 'towelhead',
  'gook', 'jap', 'paki', 'darkie', 'coon'
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slurfilter')
    .setDescription('Toggle racial/identity slur filter')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption(opt =>
      opt.setName('enabled').setDescription('Enable or disable slur filter').setRequired(true)
    ),
  cooldown: 3,
  aliases: ['toggleslurfilter', 'slurs'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const enabled = args?.[0] === 'true' || args?.[0] === 'on' || interaction.options?.getBoolean('enabled');

      const record = await getDB()('automod')
        .where({ guild_id: interaction.guild.id, type: 'wordfilter' })
        .first();

      const config = record
        ? JSON.parse(record.config)
        : { words: [], action: 'delete', logChannel: null, ignoredRoles: [], ignoredChannels: [] };

      if (!config.slurList) config.slurList = [];

      if (enabled) {
        for (const word of DEFAULT_SLURS) {
          if (!config.words.includes(word)) config.words.push(word);
          if (!config.slurList.includes(word)) config.slurList.push(word);
        }
      } else {
        config.words = config.words.filter(w => !config.slurList.includes(w));
        config.slurList = [];
      }

      if (record) {
        await getDB()('automod')
          .where({ guild_id: interaction.guild.id, type: 'wordfilter' })
          .update({ config: JSON.stringify(config), enabled: true });
      } else {
        await getDB()('automod').insert({
          guild_id: interaction.guild.id,
          type: 'wordfilter',
          config: JSON.stringify(config),
          enabled: true
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('Slur Filter')
        .setDescription(`Slur filter has been **${enabled ? 'enabled' : 'disabled'}**.\nAdded ${DEFAULT_SLURS.length} default slurs.`)
        .setColor(enabled ? embedColors.success : embedColors.warning)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to toggle slur filter.')] });
    }
  }
};
