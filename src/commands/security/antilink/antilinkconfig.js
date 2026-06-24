const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antilinkconfig')
    .setDescription('Configure antilink settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('action').setDescription('Action against links')
        .addChoices(
          { name: 'delete', value: 'delete' },
          { name: 'warn', value: 'warn' },
          { name: 'mute', value: 'mute' },
          { name: 'kick', value: 'kick' }
        )
    )
    .addBooleanOption(opt =>
      opt.setName('blockinvites').setDescription('Block Discord invites')
    )
    .addBooleanOption(opt =>
      opt.setName('blockurls').setDescription('Block all URLs')
    ),
  cooldown: 5,
  aliases: ['alconfig'],
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
        const blockInvites = interaction.options?.getBoolean('blockinvites');
        const blockUrls = interaction.options?.getBoolean('blockurls');

        if (action) antilinkConfig.action = action;
        if (blockInvites !== null) antilinkConfig.blockInvites = blockInvites;
        if (blockUrls !== null) antilinkConfig.blockUrls = blockUrls;
      } else {
        const args = interaction.content.split(' ').slice(1);
        const settingsMap = {
          'action': 'action',
          'blockinvites': 'blockInvites',
          'blockurls': 'blockUrls'
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
        action: antilinkConfig.action || 'delete',
        blockInvites: antilinkConfig.blockInvites !== undefined ? antilinkConfig.blockInvites : true,
        blockUrls: antilinkConfig.blockUrls !== undefined ? antilinkConfig.blockUrls : false
      };

      await updateGuild(guild.id, { antilink_config: JSON.stringify(antilinkConfig) });

      const embed = successEmbed(
        'Antilink Configuration Updated',
        `**Action:** ${antilinkConfig.action}\n` +
        `**Block Invites:** ${antilinkConfig.blockInvites ? '✅ Yes' : '❌ No'}\n` +
        `**Block URLs:** ${antilinkConfig.blockUrls ? '✅ Yes' : '❌ No'}`
      );

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to update antilink configuration.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
