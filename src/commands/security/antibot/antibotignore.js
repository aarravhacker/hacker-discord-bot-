const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { successEmbed, errorEmbed, warningEmbed } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antibotignore')
    .setDescription('Add or remove a bot from antibot ignore list')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('action').setDescription('Add or remove').setRequired(true)
        .addChoices({ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' })
    )
    .addStringOption(opt =>
      opt.setName('botid').setDescription('Bot user ID').setRequired(true)
    ),
  cooldown: 5,
  aliases: ['abignore'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;

    try {
      const guildData = await getGuild(guild.id);
      let ignoreList = JSON.parse(guildData.antibot_config || '{}').ignore || [];

      let botId;
      if (isSlash) {
        botId = interaction.options?.getString('botid');
      } else {
        const args = interaction.content.split(' ').slice(1);
        if (args.length < 2) {
          return interaction.reply({ embeds: [warningEmbed('Warning', 'Usage: antibotignore <add|remove> <botid>')] });
        }
        botId = args[1].replace(/[<@!>]/g, '');
      }

      const action = isSlash ? interaction.options?.getString('action') : interaction.content.split(' ')[1]?.toLowerCase();
      if (!action || !['add', 'remove'].includes(action)) {
        return interaction.reply({ embeds: [warningEmbed('Warning', 'Please specify add or remove.')] });
      }

      if (action === 'add') {
        if (ignoreList.includes(botId)) {
          return interaction.reply({ embeds: [warningEmbed('Warning', 'Bot is already ignored.')] });
        }
        ignoreList.push(botId);
      } else {
        ignoreList = ignoreList.filter(id => id !== botId);
      }

      let antibotConfig = JSON.parse(guildData.antibot_config || '{}');
      antibotConfig.ignore = ignoreList;
      await updateGuild(guild.id, { antibot_config: JSON.stringify(antibotConfig) });

      const embed = successEmbed(
        'Antibot Ignore List Updated',
        `${action === 'add' ? '✅ Added' : '❌ Removed'} bot <@${botId}> ${action === 'add' ? 'to' : 'from'} the ignore list.`
      );

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to update antibot ignore list.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
