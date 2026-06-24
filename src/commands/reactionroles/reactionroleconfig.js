const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, infoEmbed, errorEmbed } = require('../../utils/helpers');
const { getGuild, updateGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactionroleconfig')
    .setDescription('Configure reaction role settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable/disable reaction roles'))
    .addChannelOption(opt => opt.setName('logchannel').setDescription('Channel for reaction role logs'))
    .addIntegerOption(opt => opt.setName('maxpermessage').setDescription('Max roles per message').setMinValue(1).setMaxValue(25)),
  cooldown: 5,
  aliases: ['rrconfig'],
  prefix: true,
  async execute(interaction, args) {
      const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
      try {
            const guild = await getGuild(interaction.guild.id);
            const data = guild.reaction_role_config || {};

            if (isSlash) {
              const enabled = interaction.options?.getBoolean('enabled');
              const logChannel = interaction.options?.getChannel('logchannel');
              const maxPerMsg = interaction.options?.getInteger('maxpermessage');

              if (enabled !== null && enabled !== undefined) data.enabled = enabled;
              if (logChannel) data.log_channel = logChannel.id;
              if (maxPerMsg !== null && maxPerMsg !== undefined) data.max_per_message = maxPerMsg;
            } else {
              for (let i = 0; i < (args?.length || 0) - 1; i += 2) {
                const key = args[i].toLowerCase();
                const value = args[i + 1];
                if (key === 'enabled') data.enabled = value === 'true';
                else if (key === 'logchannel' || key === 'log') data.log_channel = value.replace(/[<>#]/g, '');
                else if (key === 'maxpermessage' || key === 'max') data.max_per_message = parseInt(value);
              }
            }

            await updateGuild(interaction.guild.id, { reaction_role_config: data });

            const embed = infoEmbed('Reaction Role Config', [
              `**Enabled:** ${data.enabled !== false ? 'Yes' : 'No'}`,
              `**Log Channel:** ${data.log_channel ? `<#${data.log_channel}>` : 'Not set'}`,
              `**Max Per Message:** ${data.max_per_message || 25}`
            ].join('\n'));

            return interaction.reply({ embeds: [successEmbed('Config Updated', 'Reaction role settings saved.'), embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
