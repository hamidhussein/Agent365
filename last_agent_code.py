from fpdf import FPDF

# Create a PDF document
pdf = FPDF()
pdf.add_page()
pdf.set_font('helvetica', size=12)

# Title
pdf.cell(200, 10, 'Friday Timings - Islamabad Model College for Girls', ln=True, align='C')

# Add line breaks
pdf.ln(10)

# Timings Details
timings = [
    ('Assembly', '8:25 – 8:40'),
    ('1st Period', '8:40 – 9:15'),
    ('2nd Period', '9:15 – 9:45'),
    ('3rd Period', '9:45 – 10:15'),
    ('4th Period', '10:15 – 10:45'),
    ('Break', '10:45 – 11:00'),
    ('6th Period', '11:00 – 11:30'),
    ('7th Period', '11:30 – 12:00'),
    ('8th Period', '12:00 – 12:30'),
]

# Print the timings in the PDF
for period, timing in timings:
    pdf.cell(0, 10, '{:<15} {}'.format(period, timing), ln=True)

# Save the PDF to a file
pdf_file = 'friday_timings_imcg.pdf'
pdf.output(pdf_file)

pdf_file