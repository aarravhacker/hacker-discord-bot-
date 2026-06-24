const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { successEmbed, errorEmbed, infoEmbed, warningEmbed } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inviteblacklist')
    .setDescription('Manage invite blacklist')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('action').setDescription('Add, remove, or list').setRequired(true)
        .addChoices({ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' }, { name: 'list', value: 'list' })
    )
    .addStringOption(opt =>
      opt.setName('invite').setDescription('Invite code or server ID')
    ),
  cooldown: 5,
  aliases: ['ibl'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;

    try {
      const guildData = await getGuild(guild.id);
      let antilinkConfig = JSON.parse(guildData.antilink_config || '{}');
      let blacklist = antilinkConfig.inviteBlacklist || [];

      if (isSlash) {
        const action = interaction.options?.getString('action');
        const invite = interaction.options?.getString('invite');

        if (action === 'list') {
          if (blacklist.length === 0) {
            return interaction.reply({ embeds: [infoEmbed('Invite Blacklist', 'The blacklist is empty.')] });
          }
          const list = blacklist.map(i => `\`${i}\``).join(', ');
          return interaction.reply({ embeds: [successEmbed('Invite Blacklist', list)] });
        }

        if (!invite) {
          return interaction.reply({ embeds: [warningEmbed('Warning', 'Please specify an invite code or server ID.')] });
        }

        if (action === 'add') {
          if (blacklist.includes(invite)) {
            return interaction.reply({ embeds: [warningEmbed('Warning', 'Invite is already blacklisted.')] });
          }
          blacklist.push(invite);
        } else {
          blacklist = blacklist.filter(i => i !== invite);
        }

        antilinkConfig.inviteBlacklist = blacklist;
        await updateGuild(guild.id, { antilink_config: JSON.stringify(antilinkConfig) });

        await interaction.reply({
          embeds: [successEmbed('Invite Blacklist', `${action === 'add' ? '✅ Added' : '❌ Removed'} \`${invite}\` ${action === 'add' ? 'to' : 'from'} the blacklist.`)]
        });
      } else {
        const args = interaction.content.split(' ').slice(1);
        if (args.length === 0 || args[0] === 'list') {
          if (blacklist.length === 0) {
            return interaction.reply({ embeds: [infoEmbed('Invite Blacklist', 'The blacklist is empty.')] });
          }
          const list = blacklist.map(i => `\`${i}\``).join(', ');
          return interaction.reply({ embeds: [successEmbed('Invite Blacklist', list)] });
        }

        if (args.length < 3) {
          return interaction.reply({ embeds: [warningEmbed('Warning', 'Usage: inviteblacklist <add|remove|list> <invite>')] });
        }

        const action = args[0].toLowerCase();
        const invite = args[2];

        if (action === 'add') {
          if (blacklist.includes(invite)) {
            return interaction.reply({ embeds: [warningEmbed('Warning', 'Invite is already blacklisted.')] });
          }
          blacklist.push(invite);
        } else if (action === 'remove') {
          blacklist = blacklist.filter(i => i !== invite);
        }

        antilinkConfig.inviteBlacklist = blacklist;
        await updateGuild(guild.id, { antilink_config: JSON.stringify(antilinkConfig) });

        await interaction.reply({
          embeds: [successEmbed('Invite Blacklist', `${action === 'add' ? '✅ Added' : '❌ Removed'} \`${invite}\` ${action === 'add' ? 'to' : 'from'} the blacklist.`)]
        });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to manage invite blacklist.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
