import React from 'react';

interface SEOOutput {
    summary: {
        total_pages: number;
        avg_seo_score: number;
        avg_word_count: number;
        avg_load_time_ms: number;
        missing_titles: number;
        missing_meta_desc: number;
        missing_h1: number;
        images_without_alt_total: number;
    };
    recommendations: Array<{
        priority: string;
        issue: string;
        recommendation: string;
        expected_impact: string;
    }>;
    pages: Array<{
        url: string;
        title: string;
        seo_score: number;
        load_time_ms: number;
        status: number;
        h1_count: number;
        images_without_alt: number;
    }>;
    pdf_base64: string;
}

interface SEOReportProps {
    data: SEOOutput;
}

const SEOReport: React.FC<SEOReportProps> = ({ data }) => {
    const { summary, recommendations, pages, pdf_base64 } = data;

    const downloadPDF = () => {
        if (!pdf_base64) return;
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${pdf_base64}`;
        link.download = 'seo_audit_report.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-700 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">SEO Audit Report</h2>
                    <p className="text-gray-400 text-sm mt-1">
                        Analyzed {summary.total_pages} page{summary.total_pages !== 1 && 's'}
                    </p>
                </div>
                {pdf_base64 && (
                    <button
                        onClick={downloadPDF}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md transition-colors flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download PDF
                    </button>
                )}
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                    label="Avg SEO Score"
                    value={summary.avg_seo_score.toFixed(1)}
                    color={summary.avg_seo_score >= 80 ? 'text-green-400' : summary.avg_seo_score >= 50 ? 'text-yellow-400' : 'text-red-400'}
                />
                <MetricCard label="Avg Load Time (ms)" value={summary.avg_load_time_ms.toFixed(0)} />
                <MetricCard label="Avg Word Count" value={summary.avg_word_count.toFixed(0)} />
                <MetricCard label="Images w/o Alt" value={summary.images_without_alt_total} color={summary.images_without_alt_total > 0 ? 'text-red-400' : 'text-green-400'} />
            </div>

            {/* Health Checklist */}
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Critical Health Checks</h3>
                <div className="space-y-3">
                    <HealthItem label="Page Titles" missing={summary.missing_titles} />
                    <HealthItem label="Meta Descriptions" missing={summary.missing_meta_desc} />
                    <HealthItem label="H1 Headers" missing={summary.missing_h1} />
                </div>
            </div>

            {/* Recommendations */}
            {recommendations && recommendations.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white">AI Recommendations</h3>
                    <div className="grid gap-4">
                        {recommendations.map((rec, idx) => (
                            <div key={idx} className="bg-gray-800/30 p-4 rounded-lg border border-gray-700 hover:border-blue-500/50 transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-1">
                                        <h4 className="font-semibold text-white">{rec.issue}</h4>
                                        <p className="text-sm text-gray-300">{rec.recommendation}</p>
                                        <p className="text-xs text-blue-400 mt-2">Impact: {rec.expected_impact}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-medium border ${rec.priority === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                            rec.priority === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                        }`}>
                                        {rec.priority}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Pages Table */}
            <div>
                <h3 className="text-xl font-bold text-white mb-4">Crawled Pages</h3>
                <div className="overflow-x-auto rounded-lg border border-gray-700">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-gray-800 text-gray-200 uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3">URL</th>
                                <th className="px-4 py-3">Score</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Time</th>
                                <th className="px-4 py-3">Issues</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700 bg-gray-900/50">
                            {pages.map((page, i) => (
                                <tr key={i} className="hover:bg-gray-800/50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-white truncate max-w-[200px] hover:whitespace-normal" title={page.url}>
                                        <a href={page.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400">{page.url}</a>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`${page.seo_score >= 80 ? 'text-green-400' :
                                                page.seo_score >= 50 ? 'text-yellow-400' : 'text-red-400'
                                            }`}>{page.seo_score}</span>
                                    </td>
                                    <td className="px-4 py-3">{page.status}</td>
                                    <td className="px-4 py-3">{page.load_time_ms.toFixed(0)}ms</td>
                                    <td className="px-4 py-3">
                                        {page.h1_count === 0 && <span className="text-red-400 mr-2" title="Missing H1">No H1</span>}
                                        {page.images_without_alt > 0 && <span className="text-orange-400" title={`${page.images_without_alt} Images without Alt`}>{page.images_without_alt} Alt Missing</span>}
                                        {page.h1_count > 0 && page.images_without_alt === 0 && <span className="text-green-500">Good</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ label, value, color = 'text-white' }: { label: string, value: string | number, color?: string }) => (
    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
        <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
);

const HealthItem = ({ label, missing }: { label: string, missing: number }) => (
    <div className="flex items-center justify-between">
        <span className="text-gray-300">{label}</span>
        {missing === 0 ? (
            <span className="flex items-center text-green-400 text-sm gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                All Good
            </span>
        ) : (
            <span className="flex items-center text-red-400 text-sm gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {missing} Missing
            </span>
        )}
    </div>
);

export default SEOReport;
