const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/helpers');

const aestheticMap = {
  a:'ａ', b:'ｂ', c:'ｃ', d:'ｄ', e:'ｅ', f:'ｆ', g:'ｇ', h:'ｈ', i:'ｉ', j:'ｊ',
  k:'ｋ', l:'ｌ', m:'ｍ', n:'ｎ', o:'ｏ', p:'ｐ', q:'ｑ', r:'ｒ', s:'ｓ', t:'ｔ',
  u:'ｕ', v:'ｖ', w:'ｗ', x:'ｘ', y:'ｙ', z:'ｚ',
  A:'Ａ', B:'Ｂ', C:'Ｃ', D:'Ｄ', E:'Ｅ', F:'Ｆ', G:'Ｇ', H:'Ｈ', I:'Ｉ', J:'Ｊ',
  K:'Ｋ', L:'Ｌ', M:'Ｍ', N:'Ｎ', O:'Ｏ', P:'Ｐ', Q:'Ｑ', R:'Ｒ', S:'Ｓ', T:'Ｔ',
  U:'Ｕ', V:'Ｖ', W:'Ｗ', X:'Ｘ', Y:'Ｙ', Z:'Ｚ',
  '0':'０', '1':'１', '2':'２', '3':'３', '4':'４', '5':'５', '6':'６', '7':'７', '8':'８', '9':'９'
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aesthetic')
    .setDescription('Convert text to fullwidth aesthetic')
    .addStringOption(opt =>
      opt.setName('text').setDescription('Text to convert').setRequired(true)
    ),
  cooldown: 3,
  aliases: ['fullwidth', 'fw'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const text = args?.join(' ') || interaction.options?.getString('text');
            if (!text) {
              return interaction.reply({ embeds: [createEmbed('⚠️ Please provide text.', 'warning')] });
            }
            const result = text.split('').map(c => aestheticMap[c] || c).join('');
            interaction.reply({ embeds: [createEmbed(result, 'info')] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};