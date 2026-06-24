const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reverse')
    .setDescription('Reverse text or mirror it')
    .addStringOption(opt =>
      opt.setName('text').setDescription('Text to reverse').setRequired(true)
    ),
  cooldown: 3,
  aliases: ['mirror', 'rev'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const text = args?.join(' ') || interaction.options?.getString('text');
            if (!text) {
              return interaction.reply({ embeds: [createEmbed('⚠️ Please provide text to reverse.', 'warning')] });
            }
            const reversed = text.split('').reverse().join('');
            const mirrorMap = { a:'ɐ', b:'q', c:'ɔ', d:'p', e:'ə', f:'ɟ', g:'ƃ', h:'ɥ',
              i:'ᴉ', j:'ɾ', k:'ʞ', l:'l', m:'ɯ', n:'u', o:'o', p:'d', q:'b',
              r:'ɹ', s:'s', t:'ʇ', u:'n', v:'ʌ', w:'ʍ', x:'x', y:'ʎ', z:'z',
              A:'∀', B:'q', C:'Ɔ', D:'p', E:'Ǝ', F:'Ⅎ', G:'⅁', H:'H',
              I:'I', J:'ſ', K:'ʞ', L:'˥', M:'W', N:'N', O:'O', P:'Ԁ',
              Q:'Q', R:'ɹ', S:'S', T:'⊥', U:'∩', V:'Λ', W:'M', X:'X',
              Y:'⅄', Z:'Z', '!':'¡', '?':'¿', '.':'·', ',':'\'',
              '(':')', ')':'(', '[':']', ']':'[', '{':'}', '}':'{',
              '<':'>', '>':'<', '/':'\\', '\\':'/', '_':'‾'
            };
            const mirrored = text.split('').reverse().map(c => mirrorMap[c] || c).join('');
            interaction.reply({
              embeds: [createEmbed(`**Reversed:**\n\`${reversed}\`\n\n**Mirrored:**\n\`${mirrored}\``, 'info')]
            });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};