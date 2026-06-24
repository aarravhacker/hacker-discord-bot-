const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { successEmbed, errorEmbed, infoEmbed, warningEmbed } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukelimit')
    .setDescription('Set antinuke action limits')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('type').setDescription('Limit type').setRequired(true)
        .addChoices(
          { name: 'channel-delete', value: 'channelDelete' },
          { name: 'channel-create', value: 'channelCreate' },
          { name: 'role-delete', value: 'roleDelete' },
          { name: 'role-create', value: 'roleCreate' },
          { name: 'member-ban', value: 'memberBan' },
          { name: 'member-kick', value: 'memberKick' }
        )
    )
    .addIntegerOption(opt =>
      opt.setName('limit').setDescription('Limit value (1-50)').setRequired(true).setMinValue(1).setMaxValue(50)
    ),
  cooldown: 5,
  aliases: ['anlimit'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;

    try {
      const guildData = await getGuild(guild.id);
      let antinukeConfig = JSON.parse(guildData.antinuke_config || '{}');

      let type;
      let limit;

      if (isSlash) {
        type = interaction.options?.getString('type');
        limit = interaction.options?.getInteger('limit');
      } else {
        const args = interaction.content.split(' ').slice(1);
        if (args.length < 2) {
          return interaction.reply({ embeds: [warningEmbed('Warning', 'Usage: antinukelimit <type> <limit>')] });
        }
        type = args[0];
        limit = parseInt(args[1]);
        if (isNaN(limit) || limit < 1 || limit > 50) {
          return interaction.reply({ embeds: [warningEmbed('Warning', 'Limit must be between 1 and 50.')] });
        }
      }

      antinukeConfig[type] = limit;
      await updateGuild(guild.id, { antinuke_config: JSON.stringify(antinukeConfig) });

      const embed = successEmbed(
        'Antinuke Limit Updated',
        `**${type}** limit has been set to **${limit}**.`
      );

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to update antinuke limit.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
