const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { successEmbed, errorEmbed, infoEmbed, warningEmbed } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukewhitelist')
    .setDescription('Manage antinuke whitelist')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('action').setDescription('Add or remove').setRequired(true)
        .addChoices({ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' }, { name: 'list', value: 'list' })
    )
    .addUserOption(opt =>
      opt.setName('user').setDescription('User to whitelist')
    ),
  cooldown: 5,
  aliases: ['anwl', 'anwhitelist'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;
    const user = isSlash ? interaction.user : interaction.author;
    if (user.id !== process.env.OWNER_ID) {
      return interaction.reply({ embeds: [errorEmbed('Error', '❌ Only the bot owner can manage the security whitelist.')] });
    }

    try {
      const guildData = await getGuild(guild.id);
      let whitelist = JSON.parse(guildData.whitelist || '[]');

      if (isSlash) {
        const action = interaction.options?.getString('action');
        const targetUser = interaction.options?.getUser('user');

        if (action === 'list') {
          if (whitelist.length === 0) {
            return interaction.reply({ embeds: [infoEmbed('Antinuke Whitelist', 'The whitelist is empty.')] });
          }
          const list = whitelist.map(id => `<@${id}>`).join(', ');
          return interaction.reply({ embeds: [successEmbed('Antinuke Whitelist', list)] });
        }

        if (!targetUser) {
          return interaction.reply({ embeds: [warningEmbed('Warning', 'Please specify a user.')] });
        }

        if (action === 'add') {
          if (whitelist.includes(targetUser.id)) {
            return interaction.reply({ embeds: [warningEmbed('Warning', 'User is already whitelisted.')] });
          }
          whitelist.push(targetUser.id);
        } else {
          whitelist = whitelist.filter(id => id !== targetUser.id);
        }

        await updateGuild(guild.id, { whitelist: JSON.stringify(whitelist) });
        await interaction.reply({
          embeds: [successEmbed('Antinuke Whitelist', `${action === 'add' ? '✅ Added' : '❌ Removed'} ${targetUser.tag} ${action === 'add' ? 'to' : 'from'} the whitelist.`)]
        });
      } else {
        const args = interaction.content.split(' ').slice(1);
        if (args.length === 0 || args[0] === 'list') {
          if (whitelist.length === 0) {
            return interaction.reply({ embeds: [infoEmbed('Antinuke Whitelist', 'The whitelist is empty.')] });
          }
          const list = whitelist.map(id => `<@${id}>`).join(', ');
          return interaction.reply({ embeds: [successEmbed('Antinuke Whitelist', list)] });
        }

        if (args.length < 3) {
          return interaction.reply({ embeds: [warningEmbed('Warning', 'Usage: antinukewhitelist <add|remove|list> <user>')] });
        }

        const action = args[0].toLowerCase();
        const userId = args[2].replace(/[<@!>]/g, '');

        if (action === 'add') {
          if (whitelist.includes(userId)) {
            return interaction.reply({ embeds: [warningEmbed('Warning', 'User is already whitelisted.')] });
          }
          whitelist.push(userId);
        } else if (action === 'remove') {
          whitelist = whitelist.filter(id => id !== userId);
        }

        await updateGuild(guild.id, { whitelist: JSON.stringify(whitelist) });
        await interaction.reply({
          embeds: [successEmbed('Antinuke Whitelist', `${action === 'add' ? '✅ Added' : '❌ Removed'} <@${userId}> ${action === 'add' ? 'to' : 'from'} the whitelist.`)]
        });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to manage antinuke whitelist.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
