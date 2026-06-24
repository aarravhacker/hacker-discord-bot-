const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/helpers');

const emojiMap = {
  a:'🇦', b:'🇧', c:'🇨', d:'🇩', e:'🇪', f:'🇫', g:'🇬', h:'🇭', i:'🇮', j:'🇯',
  k:'🇰', l:'🇱', m:'🇲', n:'🇳', o:'🇴', p:'🇵', q:'🇶', r:'🇷', s:'🇸', t:'🇹',
  u:'🇺', v:'🇻', w:'🇼', x:'🇽', y:'🇾', z:'🇿',
  '0':'0️⃣', '1':'1️⃣', '2':'2️⃣', '3':'3️⃣', '4':'4️⃣',
  '5':'5️⃣', '6':'6️⃣', '7':'7️⃣', '8':'8️⃣', '9':'9️⃣',
  '!':'❗', '?':'❓', '*':'✳️', '#':'#️⃣', '0':'0️⃣'
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('emoji')
    .setDescription('Convert text to emoji letters')
    .addStringOption(opt =>
      opt.setName('text').setDescription('Text to convert').setRequired(true)
    ),
  cooldown: 3,
  aliases: ['emojitext', 'flag'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const text = args?.join(' ') || interaction.options?.getString('text');
            if (!text) {
              return interaction.reply({ embeds: [createEmbed('⚠️ Please provide text.', 'warning')] });
            }
            const result = text.toLowerCase().split('').map(c => {
              if (c === ' ') return '   ';
              return emojiMap[c] || c;
            }).join(' ');
            interaction.reply({ embeds: [createEmbed(result, 'info')] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};