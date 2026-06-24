const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('category')
    .setDescription('Manage a category')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('info').setDescription('Get category info')
      .addChannelOption(opt => opt.setName('category').setDescription('Category').addChannelTypes(ChannelType.GuildCategory).setRequired(true)))
    .addSubcommand(sub => sub.setName('list').setDescription('List all categories'))
    .addSubcommand(sub => sub.setName('channels').setDescription('List channels in a category')
      .addChannelOption(opt => opt.setName('category').setDescription('Category').addChannelTypes(ChannelType.GuildCategory).setRequired(true))),
  cooldown: 3,
  aliases: ['cat'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
      try {
            const sub = interaction.options?.getSubcommand() || args?.[0];

            if (sub === 'info') {
              const cat = interaction.options?.getChannel('category') || interaction.guild.channels.cache.get(args?.[1]);
              if (!cat || cat.type !== ChannelType.GuildCategory) {
                return interaction.reply({ embeds: [errorEmbed('Please provide a valid category.')] });
              }
              const channels = interaction.guild.channels.cache.filter(c => c.parentId === cat.id);
              return interaction.reply({
                embeds: [infoEmbed(`**${cat.name}**\nChannels: ${channels.size}\nCreated: <t:${Math.floor(cat.createdTimestamp / 1000)}:R>`)]
              });
            }

            if (sub === 'list') {
              const categories = interaction.guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory);
              if (!categories.size) return interaction.reply({ embeds: [errorEmbed('No categories found.')] });
              const list = categories.map(c => `**${c.name}** (${interaction.guild.channels.cache.filter(ch => ch.parentId === c.id).size} channels)`).join('\n');
              return interaction.reply({ embeds: [infoEmbed(list)] });
            }

            if (sub === 'channels') {
              const cat = interaction.options?.getChannel('category') || interaction.guild.channels.cache.get(args?.[1]);
              if (!cat || cat.type !== ChannelType.GuildCategory) {
                return interaction.reply({ embeds: [errorEmbed('Please provide a valid category.')] });
              }
              const channels = interaction.guild.channels.cache.filter(c => c.parentId === cat.id);
              if (!channels.size) return interaction.reply({ embeds: [errorEmbed('No channels in this category.')] });
              const list = channels.map(c => `${c.type === 2 ? '🔊' : '📝'} ${c}`).join('\n');
              return interaction.reply({ embeds: [infoEmbed(`**${cat.name}** channels:\n${list}`)] });
            }

            return interaction.reply({ embeds: [errorEmbed('Invalid subcommand. Use `info`, `list`, or `channels`.')] });
      } catch (err) {
          await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};