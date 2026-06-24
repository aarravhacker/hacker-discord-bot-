const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const { getShoukaku, isSlashCommand, getQueue } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Toggle loop mode (off/track/queue)')
    .addStringOption(opt =>
      opt.setName('mode')
        .setDescription('Loop mode')
        .addChoices(
          { name: 'off', value: 'off' },
          { name: 'track', value: 'track' },
          { name: 'queue', value: 'queue' }
        )
    ),
  cooldown: 2,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = isSlashCommand(interaction);
            const shoukaku = getShoukaku();
            if (!shoukaku) return interaction.reply({ content: '❌ Music system not connected!' });

            const player = shoukaku.players.get(interaction.guild.id);
            if (!player) return interaction.reply({ content: '❌ Nothing is playing!' });

            const queue = getQueue(interaction.guild.id);

            let mode;
            if (isSlash) {
              mode = interaction.options?.getString('mode');
            } else {
              mode = args?.[0]?.toLowerCase();
            }

            if (!mode || !['off', 'track', 'queue'].includes(mode)) {
              const currentMode = queue.loop === 'none' ? 'off' : queue.loop;
              return interaction.reply(`🔄 Current loop mode: **${currentMode}**\nUsage: \`.loop <off|track|queue>\``);
            }

            queue.loop = mode;

            const emoji = mode === 'off' ? '➡️' : '🔁';
            await interaction.reply(`${emoji} Loop mode set to **${mode}**`);
      } catch (err) {
          await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] }).catch(() => {});
      }
  }
};