const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');
const { getGuild, updateGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Manage the whitelist')
    .addSubcommand(sub => sub
      .setName('add')
      .setDescription('Add a user to the whitelist')
      .addUserOption(option => option.setName('user').setDescription('The user to whitelist').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('remove')
      .setDescription('Remove a user from the whitelist')
      .addUserOption(option => option.setName('user').setDescription('The user to unwhitelist').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('View the whitelist'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['wh'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const subcommand = isSlash ? interaction.options?.getSubcommand() : args?.[0];
    const target = isSlash ? interaction.options?.getUser('user') : interaction.guild.members.cache.get(args?.[1]?.replace(/[<>@!]/g, ''))?.user;

    try {
      const guildConfig = await getGuild(interaction.guild.id);
      let whitelist = guildConfig?.whitelist || [];

      if (subcommand === 'add') {
        if (!target) return interaction.reply({ embeds: [errorEmbed('Please provide a valid user.')] });
        if (whitelist.includes(target.id)) return interaction.reply({ embeds: [errorEmbed('This user is already whitelisted.')] });

        whitelist.push(target.id);
        await updateGuild(interaction.guild.id, { whitelist });

        return interaction.reply({ embeds: [successEmbed(`Successfully whitelisted ${target.tag}.`)] });
      } else if (subcommand === 'remove') {
        if (!target) return interaction.reply({ embeds: [errorEmbed('Please provide a valid user.')] });
        if (!whitelist.includes(target.id)) return interaction.reply({ embeds: [errorEmbed('This user is not whitelisted.')] });

        whitelist = whitelist.filter(id => id !== target.id);
        await updateGuild(interaction.guild.id, { whitelist });

        return interaction.reply({ embeds: [successEmbed(`Successfully removed ${target.tag} from the whitelist.`)] });
      } else if (subcommand === 'list') {
        if (whitelist.length === 0) {
          return interaction.reply({ embeds: [infoEmbed('The whitelist is empty.')] });
        }

        const list = whitelist.map(id => `<@${id}>`).join('\n');
        return interaction.reply({ embeds: [infoEmbed(`Whitelist:\n${list}`)] });
      } else {
        return interaction.reply({ embeds: [errorEmbed('Please specify a subcommand: add, remove, or list.')] });
      }
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while managing the whitelist.')] });
    }
  }
};
