const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, infoEmbed, errorEmbed } = require('../../utils/helpers');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('View or edit server configuration')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('view').setDescription('View current config'))
    .addSubcommand(sub => sub.setName('set').setDescription('Set a config value')
      .addStringOption(opt => opt.setName('key').setDescription('Config key').setRequired(true))
      .addStringOption(opt => opt.setName('value').setDescription('Config value').setRequired(true)))
    .addSubcommand(sub => sub.setName('reset').setDescription('Reset a config key')
      .addStringOption(opt => opt.setName('key').setDescription('Config key to reset').setRequired(true)))
    .addSubcommand(sub => sub.setName('resetall').setDescription('Reset all config to defaults')),
  cooldown: 5,
  aliases: ['serverconfig', 'guildconfig'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
      try {
            const sub = interaction.options?.getSubcommand() || args?.[0];
            const guildData = await getGuild(interaction.guild.id);

            if (sub === 'view') {
              const embed = infoEmbed('**Server Configuration**')
                .addFields(
                  { name: 'Prefix', value: guildData.prefix || '!', inline: true },
                  { name: 'Welcome Channel', value: guildData.welcomeChannelId ? `<#${guildData.welcomeChannelId}>` : 'Not set', inline: true },
                  { name: 'Goodbye Channel', value: guildData.goodbyeChannelId ? `<#${guildData.goodbyeChannelId}>` : 'Not set', inline: true },
                  { name: 'Log Channel', value: guildData.logChannelId ? `<#${guildData.logChannelId}>` : 'Not set', inline: true },
                  { name: 'Starboard Channel', value: guildData.starboardChannelId ? `<#${guildData.starboardChannelId}>` : 'Not set', inline: true },
                  { name: 'Level Up Channel', value: guildData.levelUpChannelId ? `<#${guildData.levelUpChannelId}>` : 'Not set', inline: true },
                  { name: 'Boost Channel', value: guildData.boostChannelId ? `<#${guildData.boostChannelId}>` : 'Not set', inline: true },
                  { name: 'Rules Channel', value: guildData.rulesChannelId ? `<#${guildData.rulesChannelId}>` : 'Not set', inline: true },
                  { name: 'Welcome Message', value: (guildData.welcomeMessage || 'Not set').slice(0, 1024), inline: false },
                  { name: 'Goodbye Message', value: (guildData.goodbyeMessage || 'Not set').slice(0, 1024), inline: false }
                );
              return interaction.reply({ embeds: [embed] });
            }

            if (sub === 'set') {
              const key = interaction.options?.getString('key') || args?.[1];
              const value = interaction.options?.getString('value') || args?.slice(2).join(' ');
              if (!key) return interaction.reply({ embeds: [errorEmbed('Please provide a config key.')] });

              const validKeys = ['prefix', 'welcomeChannelId', 'goodbyeChannelId', 'logChannelId', 'starboardChannelId', 'levelUpChannelId', 'boostChannelId', 'rulesChannelId', 'welcomeMessage', 'goodbyeMessage', 'boostMessage', 'starboardEmoji', 'levelUpMessage'];
              if (!validKeys.includes(key)) {
                return interaction.reply({ embeds: [errorEmbed(`Invalid key. Valid keys: ${validKeys.join(', ')}`)] });
              }

              await updateGuild(interaction.guild.id, { [key]: value });
              return interaction.reply({ embeds: [successEmbed(`Set \`${key}\` to \`${value}\``)] });
            }

            if (sub === 'reset') {
              const key = interaction.options?.getString('key') || args?.[1];
              if (!key) return interaction.reply({ embeds: [errorEmbed('Please provide a config key.')] });
              await updateGuild(interaction.guild.id, { [key]: null });
              return interaction.reply({ embeds: [successEmbed(`Reset \`${key}\` to default.`)] });
            }

            if (sub === 'resetall') {
              await updateGuild(interaction.guild.id, {
                prefix: '!', welcomeChannelId: null, goodbyeChannelId: null, logChannelId: null,
                starboardChannelId: null, levelUpChannelId: null, boostChannelId: null,
                rulesChannelId: null, welcomeMessage: null, goodbyeMessage: null, boostMessage: null
              });
              return interaction.reply({ embeds: [successEmbed('All configuration has been reset to defaults.')] });
            }

            return interaction.reply({ embeds: [errorEmbed('Invalid subcommand. Use `view`, `set`, `reset`, or `resetall`.')] });
      } catch (err) {
          await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};