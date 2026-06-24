const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { successEmbed, errorEmbed, infoEmbed, warningEmbed } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukeignore')
    .setDescription('Add or remove a user/channel from antinuke ignore list')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('action').setDescription('Add or remove').setRequired(true)
        .addChoices({ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' })
    )
    .addUserOption(opt =>
      opt.setName('user').setDescription('User to ignore')
    )
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Channel to ignore')
    ),
  cooldown: 5,
  aliases: ['anignore', 'antinukeign'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;
    const user = isSlash ? interaction.user : interaction.author;

    try {
      const guildData = await getGuild(guild.id);
      let ignoreList = JSON.parse(guildData.antinuke_config || '{}').ignore || [];

      let targetId;
      let targetType;

      if (isSlash) {
        const targetUser = interaction.options?.getUser('user');
        const targetChannel = interaction.options?.getChannel('channel');
        if (targetUser) {
          targetId = targetUser.id;
          targetType = 'user';
        } else if (targetChannel) {
          targetId = targetChannel.id;
          targetType = 'channel';
        } else {
          return interaction.reply({ embeds: [warningEmbed('Warning', 'Please specify a user or channel to ignore.')] });
        }
      } else {
        const args = interaction.content.split(' ').slice(1);
        if (args.length < 3) {
          return interaction.reply({ embeds: [warningEmbed('Warning', 'Usage: antinukeignore <add|remove> <user/channel>')] });
        }
        targetType = args[1].toLowerCase() === 'user' || args[1].startsWith('<@') ? 'user' : 'channel';
        targetId = args[2].replace(/[<@!#&>]/g, '');
      }

      const action = isSlash ? interaction.options?.getString('action') : interaction.content.split(' ')[1]?.toLowerCase();
      if (!action || !['add', 'remove'].includes(action)) {
        return interaction.reply({ embeds: [warningEmbed('Warning', 'Please specify add or remove.')] });
      }

      const entry = `${targetType}:${targetId}`;

      if (action === 'add') {
        if (ignoreList.includes(entry)) {
          return interaction.reply({ embeds: [warningEmbed('Warning', 'This target is already ignored.')] });
        }
        ignoreList.push(entry);
      } else {
        ignoreList = ignoreList.filter(i => i !== entry);
      }

      let antinukeConfig = JSON.parse(guildData.antinuke_config || '{}');
      antinukeConfig.ignore = ignoreList;
      await updateGuild(guild.id, { antinuke_config: JSON.stringify(antinukeConfig) });

      const embed = successEmbed(
        'Antinuke Ignore List Updated',
        `${action === 'add' ? '✅ Added' : '❌ Removed'} ${targetType} <@${targetId}> ${action === 'add' ? 'to' : 'from'} the ignore list.`
      );

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to update antinuke ignore list.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
