const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { successEmbed, errorEmbed, warningEmbed } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antiraidignore')
    .setDescription('Add or remove a user from antiraid ignore list')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('action').setDescription('Add or remove').setRequired(true)
        .addChoices({ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' })
    )
    .addUserOption(opt =>
      opt.setName('user').setDescription('User to ignore').setRequired(true)
    ),
  cooldown: 5,
  aliases: ['arignore'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;

    try {
      const guildData = await getGuild(guild.id);
      let ignoreList = JSON.parse(guildData.antiraid_config || '{}').ignore || [];

      let targetUser;
      if (isSlash) {
        targetUser = interaction.options?.getUser('user');
      } else {
        const args = interaction.content.split(' ').slice(1);
        if (args.length < 2) {
          return interaction.reply({ embeds: [warningEmbed('Warning', 'Usage: antiraidignore <add|remove> <user>')] });
        }
        const userId = args[1].replace(/[<@!>]/g, '');
        targetUser = await interaction.client.users.fetch(userId).catch(() => null);
        if (!targetUser) {
          return interaction.reply({ embeds: [errorEmbed('Error', 'User not found.')] });
        }
      }

      const action = isSlash ? interaction.options?.getString('action') : interaction.content.split(' ')[1]?.toLowerCase();
      if (!action || !['add', 'remove'].includes(action)) {
        return interaction.reply({ embeds: [warningEmbed('Warning', 'Please specify add or remove.')] });
      }

      if (action === 'add') {
        if (ignoreList.includes(targetUser.id)) {
          return interaction.reply({ embeds: [warningEmbed('Warning', 'User is already ignored.')] });
        }
        ignoreList.push(targetUser.id);
      } else {
        ignoreList = ignoreList.filter(id => id !== targetUser.id);
      }

      let antiraidConfig = JSON.parse(guildData.antiraid_config || '{}');
      antiraidConfig.ignore = ignoreList;
      await updateGuild(guild.id, { antiraid_config: JSON.stringify(antiraidConfig) });

      const embed = successEmbed(
        'Antiraid Ignore List Updated',
        `${action === 'add' ? '✅ Added' : '❌ Removed'} ${targetUser.tag} ${action === 'add' ? 'to' : 'from'} the ignore list.`
      );

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to update antiraid ignore list.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
