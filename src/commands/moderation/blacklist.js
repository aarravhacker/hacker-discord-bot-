const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');
const { getGuild, updateGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Manage the blacklist')
    .addSubcommand(sub => sub
      .setName('add')
      .setDescription('Add a user to the blacklist')
      .addUserOption(option => option.setName('user').setDescription('The user to blacklist').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('remove')
      .setDescription('Remove a user from the blacklist')
      .addUserOption(option => option.setName('user').setDescription('The user to unblacklist').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('View the blacklist'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['bl'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const subcommand = isSlash ? interaction.options?.getSubcommand() : args?.[0];
    const target = isSlash ? interaction.options?.getUser('user') : interaction.guild.members.cache.get(args?.[1]?.replace(/[<>@!]/g, ''))?.user;

    try {
      const guildConfig = await getGuild(interaction.guild.id);
      let blacklist = guildConfig?.blacklist || [];

      if (subcommand === 'add') {
        if (!target) return interaction.reply({ embeds: [errorEmbed('Please provide a valid user.')] });
        if (blacklist.includes(target.id)) return interaction.reply({ embeds: [errorEmbed('This user is already blacklisted.')] });

        blacklist.push(target.id);
        await updateGuild(interaction.guild.id, { blacklist });

        return interaction.reply({ embeds: [successEmbed(`Successfully blacklisted ${target.tag}.`)] });
      } else if (subcommand === 'remove') {
        if (!target) return interaction.reply({ embeds: [errorEmbed('Please provide a valid user.')] });
        if (!blacklist.includes(target.id)) return interaction.reply({ embeds: [errorEmbed('This user is not blacklisted.')] });

        blacklist = blacklist.filter(id => id !== target.id);
        await updateGuild(interaction.guild.id, { blacklist });

        return interaction.reply({ embeds: [successEmbed(`Successfully removed ${target.tag} from the blacklist.`)] });
      } else if (subcommand === 'list') {
        if (blacklist.length === 0) {
          return interaction.reply({ embeds: [infoEmbed('The blacklist is empty.')] });
        }

        const list = blacklist.map(id => `<@${id}>`).join('\n');
        return interaction.reply({ embeds: [infoEmbed(`Blacklist:\n${list}`)] });
      } else {
        return interaction.reply({ embeds: [errorEmbed('Please specify a subcommand: add, remove, or list.')] });
      }
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while managing the blacklist.')] });
    }
  }
};
