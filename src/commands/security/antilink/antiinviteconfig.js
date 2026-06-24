const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antiinviteconfig')
    .setDescription('Configure antiinvite settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('action').setDescription('Action against invites')
        .addChoices(
          { name: 'delete', value: 'delete' },
          { name: 'warn', value: 'warn' },
          { name: 'mute', value: 'mute' },
          { name: 'kick', value: 'kick' }
        )
    )
    .addBooleanOption(opt =>
      opt.setName('blockdiscord').setDescription('Block Discord invites')
    )
    .addBooleanOption(opt =>
      opt.setName('blockother').setDescription('Block other platform invites')
    ),
  cooldown: 5,
  aliases: ['aiconfig'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;

    try {
      const guildData = await getGuild(guild.id);
      let antilinkConfig = JSON.parse(guildData.antilink_config || '{}');

      if (isSlash) {
        const action = interaction.options?.getString('action');
        const blockDiscord = interaction.options?.getBoolean('blockdiscord');
        const blockOther = interaction.options?.getBoolean('blockother');

        if (action) antilinkConfig.inviteAction = action;
        if (blockDiscord !== null) antilinkConfig.blockDiscordInvites = blockDiscord;
        if (blockOther !== null) antilinkConfig.blockOtherInvites = blockOther;
      } else {
        const args = interaction.content.split(' ').slice(1);
        const settingsMap = {
          'action': 'inviteAction',
          'blockdiscord': 'blockDiscordInvites',
          'blockother': 'blockOtherInvites'
        };
        for (let i = 0; i < args.length - 1; i += 2) {
          const key = args[i].toLowerCase();
          const value = args[i + 1];
          if (settingsMap[key]) {
            if (key === 'action') {
              antilinkConfig[settingsMap[key]] = value;
            } else {
              antilinkConfig[settingsMap[key]] = value.toLowerCase() === 'true' || value === '1';
            }
          }
        }
      }

      antilinkConfig = {
        ...antilinkConfig,
        inviteAction: antilinkConfig.inviteAction || 'delete',
        blockDiscordInvites: antilinkConfig.blockDiscordInvites !== undefined ? antilinkConfig.blockDiscordInvites : true,
        blockOtherInvites: antilinkConfig.blockOtherInvites !== undefined ? antilinkConfig.blockOtherInvites : false
      };

      await updateGuild(guild.id, { antilink_config: JSON.stringify(antilinkConfig) });

      const embed = successEmbed(
        'Antiinvite Configuration Updated',
        `**Action:** ${antilinkConfig.inviteAction}\n` +
        `**Block Discord Invites:** ${antilinkConfig.blockDiscordInvites ? '✅ Yes' : '❌ No'}\n` +
        `**Block Other Invites:** ${antilinkConfig.blockOtherInvites ? '✅ Yes' : '❌ No'}`
      );

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to update antiinvite configuration.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
