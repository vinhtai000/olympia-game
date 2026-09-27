# -*- coding: utf-8 -*-
"""
Dữ liệu câu hỏi bổ sung cho Lớp 1 (35 warmup, 25 acceleration, 21 finish).
Tổng cộng bổ sung: 81 câu hỏi, kết hợp với 19 câu cũ tạo thành đúng 100 câu.
"""

GRADE_1_DATA = {
    "warmup": [
        {"id": "g1-wu-6", "text": "Hình vuông có bao nhiêu cạnh?", "answer": "4 cạnh"},
        {"id": "g1-wu-7", "text": "Số liền sau của số 9 là số nào?", "answer": "Số 10"},
        {"id": "g1-wu-8", "text": "Đèn giao thông có bao nhiêu màu?", "answer": "3 màu"},
        {"id": "g1-wu-9", "text": "Mèo thường thích bắt con vật gì trong nhà?", "answer": "Chuột"},
        {"id": "g1-wu-10", "text": "Bộ phận nào trên khuôn mặt dùng để nghe âm thanh?", "answer": "Tai"},
        {"id": "g1-wu-11", "text": "Một năm có bao nhiêu mùa chính ở miền Bắc nước ta?", "answer": "4 mùa"},
        {"id": "g1-wu-12", "text": "Con vật nào được gọi là bạn trung thành giữ nhà cho con người?", "answer": "Chó"},
        {"id": "g1-wu-13", "text": "Từ trái nghĩa với từ 'dài' là từ gì?", "answer": "Ngắn"},
        {"id": "g1-wu-14", "text": "Số liền trước của số 1 là số nào?", "answer": "Số 0"},
        {"id": "g1-wu-15", "text": "Bàn tay của mỗi người bình thường có bao nhiêu ngón?", "answer": "5 ngón"},
        {"id": "g1-wu-16", "text": "Cây lấy chất dinh dưỡng và nước từ đất nhờ bộ phận nào?", "answer": "Rễ cây"},
        {"id": "g1-wu-17", "text": "Chữ cái đầu tiên trong bảng chữ cái tiếng Việt là chữ gì?", "answer": "Chữ A"},
        {"id": "g1-wu-18", "text": "Khi đi bộ qua đường ở ngã tư, chúng ta cần đi theo vạch sơn màu gì?", "answer": "Màu trắng"},
        {"id": "g1-wu-19", "text": "Chim di chuyển chủ yếu bằng cách nào?", "answer": "Bay"},
        {"id": "g1-wu-20", "text": "Trong phép tính 3 + 2 = 5, kết quả 5 được gọi là gì?", "answer": "Tổng"},
        {"id": "g1-wu-21", "text": "Đồ vật nào dùng để tẩy sạch vết chì khi viết sai?", "answer": "Cục tẩy"},
        {"id": "g1-wu-22", "text": "Bộ phận nào trên khuôn mặt dùng để ngửi mùi thơm?", "answer": "Mũi"},
        {"id": "g1-wu-23", "text": "Vịt bơi được dưới nước nhờ giữa các ngón chân có lớp gì?", "answer": "Màng"},
        {"id": "g1-wu-24", "text": "Số lớn nhất có một chữ số là số nào?", "answer": "Số 9"},
        {"id": "g1-wu-25", "text": "Loài hoa nào thường nở rực rỡ vào dịp Tết Nguyên Đán ở miền Bắc?", "answer": "Hoa đào"},
        {"id": "g1-wu-26", "text": "Mặt trăng thường xuất hiện và chiếu sáng vào ban nào?", "answer": "Ban đêm"},
        {"id": "g1-wu-27", "text": "Từ trái nghĩa với từ 'nóng' là từ gì?", "answer": "Lạnh"},
        {"id": "g1-wu-28", "text": "Con trâu ăn thức ăn chủ yếu là gì?", "answer": "Cỏ"},
        {"id": "g1-wu-29", "text": "1 chục que tính bằng bao nhiêu que tính?", "answer": "10 que tính"},
        {"id": "g1-wu-30", "text": "Chiếc thước kẻ thường được dùng để làm gì khi học toán?", "answer": "Kẻ đoạn thẳng"},
        {"id": "g1-wu-31", "text": "Con vật nào có hai tai dài và thích ăn củ cà rốt?", "answer": "Con thỏ"},
        {"id": "g1-wu-32", "text": "Khi thấy đèn giao thông chuyển sang màu đỏ thì người đi đường phải làm gì?", "answer": "Dừng lại"},
        {"id": "g1-wu-33", "text": "Quả trứng của loài chim nào to nhất hiện nay?", "answer": "Đà điểu"},
        {"id": "g1-wu-34", "text": "Bộ phận nào của cây làm nhiệm vụ nở ra để kết thành quả?", "answer": "Hoa"},
        {"id": "g1-wu-35", "text": "Chữ cái nào đứng ngay sau chữ O trong bảng chữ cái tiếng Việt?", "answer": "Chữ Ô"},
        {"id": "g1-wu-36", "text": "Hai chiếc dép cùng loại tạo thành một cái gì?", "answer": "Đôi dép"},
        {"id": "g1-wu-37", "text": "Khi có mưa kèm theo sấm chớp, ta nên ở trong nhà hay đứng dưới gốc cây to?", "answer": "Ở trong nhà"},
        {"id": "g1-wu-38", "text": "Số nhỏ nhất có hai chữ số là số nào?", "answer": "Số 10"},
        {"id": "g1-wu-39", "text": "Con cá thở dưới nước bằng bộ phận nào?", "answer": "Mang"},
        {"id": "g1-wu-40", "text": "Ngày đầu tiên của một tuần lễ là thứ mấy?", "answer": "Thứ hai"}
    ],
    "acceleration": [
        {"id": "g1-tt-6", "text": "Phép tính nào sau đây có kết quả bằng 10?", "options": ["4 + 5", "6 + 4", "3 + 6", "2 + 7"], "answer": "6 + 4", "timeLimitSeconds": 20},
        {"id": "g1-tt-7", "text": "Trong các con vật sau, con vật nào KHÔNG BIẾT bơi?", "options": ["Vịt", "Cá chép", "Gà", "Ếch"], "answer": "Gà", "timeLimitSeconds": 20},
        {"id": "g1-tt-8", "text": "Đồ dùng nào sau đây dùng để gọt bút chì?", "options": ["Gọt bút chì", "Thước kẻ", "Bút mực", "Compa"], "answer": "Gọt bút chì", "timeLimitSeconds": 20},
        {"id": "g1-tt-9", "text": "Số gồm 1 chục và 5 đơn vị là số nào?", "options": ["51", "15", "105", "50"], "answer": "15", "timeLimitSeconds": 20},
        {"id": "g1-tt-10", "text": "Hoa mai vàng thường nở rộ vào dịp Tết ở miền nào nước ta?", "options": ["Miền Nam", "Miền Bắc", "Miền núi phía Bắc", "Tây Bắc"], "answer": "Miền Nam", "timeLimitSeconds": 20},
        {"id": "g1-tt-11", "text": "Hình nào sau đây KHÔNG CÓ góc?", "options": ["Hình vuông", "Hình tam giác", "Hình tròn", "Hình chữ nhật"], "answer": "Hình tròn", "timeLimitSeconds": 20},
        {"id": "g1-tt-12", "text": "Từ nào sau đây viết ĐÚNG chính tả?", "options": ["Cây xuy", "Cây xanh", "Cây xang", "Cây sanh"], "answer": "Cây xanh", "timeLimitSeconds": 20},
        {"id": "g1-tt-13", "text": "9 trừ đi mấy thì bằng 3?", "options": ["5", "6", "7", "4"], "answer": "6", "timeLimitSeconds": 20},
        {"id": "g1-tt-14", "text": "Đâu là loài chim có thể bay lùi?", "options": ["Chim ruồi", "Chim sẻ", "Chim bồ câu", "Chim ưng"], "answer": "Chim ruồi", "timeLimitSeconds": 20},
        {"id": "g1-tt-15", "text": "Có 7 quả táo, ăn mất 2 quả, hỏi còn lại bao nhiêu quả?", "options": ["4 quả", "5 quả", "6 quả", "3 quả"], "answer": "5 quả", "timeLimitSeconds": 20},
        {"id": "g1-tt-16", "text": "Động vật nào sau đây đẻ trứng?", "options": ["Chó", "Mèo", "Gà", "Lợn"], "answer": "Gà", "timeLimitSeconds": 20},
        {"id": "g1-tt-17", "text": "Đồng hồ chỉ 8 giờ đúng thì kim ngắn chỉ vào số mấy?", "options": ["Số 12", "Số 8", "Số 6", "Số 1"], "answer": "Số 8", "timeLimitSeconds": 20},
        {"id": "g1-tt-18", "text": "Từ nào sau đây chỉ người dạy học cho học sinh?", "options": ["Bác sĩ", "Thầy cô giáo", "Công an", "Kỹ sư"], "answer": "Thầy cô giáo", "timeLimitSeconds": 20},
        {"id": "g1-tt-19", "text": "Trong các số: 8, 3, 10, 5, số nào lớn nhất?", "options": ["8", "3", "10", "5"], "answer": "10", "timeLimitSeconds": 20},
        {"id": "g1-tt-20", "text": "Em cần rửa tay bằng xà phòng vào lúc nào?", "options": ["Trước khi ăn cơm", "Sau khi đi vệ sinh", "Khi tay bị bẩn", "Cả 3 trường hợp trên"], "answer": "Cả 3 trường hợp trên", "timeLimitSeconds": 20},
        {"id": "g1-tt-21", "text": "Phép tính 7 - 0 có kết quả bằng bao nhiêu?", "options": ["0", "7", "1", "6"], "answer": "7", "timeLimitSeconds": 20},
        {"id": "g1-tt-22", "text": "Lá cờ Việt Nam có ngôi sao màu gì?", "options": ["Màu đỏ", "Màu trắng", "Màu vàng", "Màu xanh"], "answer": "Màu vàng", "timeLimitSeconds": 20},
        {"id": "g1-tt-23", "text": "Loài thú nào to nhất sống trên cạn hiện nay?", "options": ["Hươu cao cổ", "Voi", "Tê giác", "Hà mã"], "answer": "Voi", "timeLimitSeconds": 20},
        {"id": "g1-tt-24", "text": "Số liền trước của 18 là số nào?", "options": ["17", "19", "16", "20"], "answer": "17", "timeLimitSeconds": 20},
        {"id": "g1-tt-25", "text": "Khi ngồi trên xe máy, chúng ta bắt buộc phải đội gì?", "options": ["Mũ lưỡi trai", "Mũ bảo hiểm", "Mũ len", "Khăn quàng"], "answer": "Mũ bảo hiểm", "timeLimitSeconds": 20},
        {"id": "g1-tt-26", "text": "5 + 5 - 2 bằng bao nhiêu?", "options": ["8", "7", "10", "9"], "answer": "8", "timeLimitSeconds": 20},
        {"id": "g1-tt-27", "text": "Con vật nào sau đây di chuyển bằng cách bò sát mặt đất?", "options": ["Rắn", "Ngựa", "Thỏ", "Gà"], "answer": "Rắn", "timeLimitSeconds": 20},
        {"id": "g1-tt-28", "text": "Từ trái nghĩa với từ 'nhanh' là từ gì?", "options": ["Chậm", "Mau", "Lẹ", "Gấp"], "answer": "Chậm", "timeLimitSeconds": 20},
        {"id": "g1-tt-29", "text": "1 tuần lễ có bao nhiêu ngày nghỉ cuối tuần thường thấy?", "options": ["1 ngày", "2 ngày", "3 ngày", "4 ngày"], "answer": "2 ngày", "timeLimitSeconds": 20},
        {"id": "g1-tt-30", "text": "Để giữ răng chắc khỏe và trắng sạch, em cần làm gì mỗi ngày?", "options": ["Ăn nhiều kẹo", "Đánh răng sáng và tối", "Uống nước ngọt", "Không súc miệng"], "answer": "Đánh răng sáng và tối", "timeLimitSeconds": 20}
    ],
    "finish": [
        # 7 câu 10 điểm
        {"id": "g1-vd-10-4", "points": 10, "text": "Có bao nhiêu chữ cái trong từ 'MẸ'?", "answer": "2 chữ cái"},
        {"id": "g1-vd-10-5", "points": 10, "text": "Trong phép cộng 4 + 3 = 7, các số 4 và 3 được gọi là gì?", "answer": "Số hạng"},
        {"id": "g1-vd-10-6", "points": 10, "text": "Cây bút chì thường dùng ruột làm từ chất liệu gì màu xám đen?", "answer": "Than chì"},
        {"id": "g1-vd-10-7", "points": 10, "text": "Ban ngày có ánh sáng từ vật thể tự nhiên nào chiếu xuống Trái Đất?", "answer": "Mặt Trời"},
        {"id": "g1-vd-10-8", "points": 10, "text": "Con người có bao nhiêu giác quan chính?", "answer": "5 giác quan"},
        {"id": "g1-vd-10-9", "points": 10, "text": "1 chục que tính cộng thêm 3 que tính thì bằng bao nhiêu que tính?", "answer": "13 que tính"},
        {"id": "g1-vd-10-10", "points": 10, "text": "Bát nước chấm ở mâm cơm thường có vị gì đặc trưng?", "answer": "Vị mặn"},

        # 7 câu 20 điểm
        {"id": "g1-vd-20-4", "points": 20, "text": "Vừa gà vừa chó có tổng cộng 2 con, đếm được 6 cái chân. Hỏi có mấy con gà và mấy con chó?", "answer": "1 con gà và 1 con chó"},
        {"id": "g1-vd-20-5", "points": 20, "text": "Bài hát Quốc ca của nước Cộng hòa Xã hội Chủ nghĩa Việt Nam do nhạc sĩ nào sáng tác?", "answer": "Văn Cao"},
        {"id": "g1-vd-20-6", "points": 20, "text": "Lan có 5 cái kẹo, mẹ cho thêm 4 cái, Lan cho em 3 cái. Hỏi Lan còn lại bao nhiêu cái kẹo?", "answer": "6 cái kẹo"},
        {"id": "g1-vd-20-7", "points": 20, "text": "Loài chim bồ câu thường được xem là biểu tượng cho điều gì?", "answer": "Hòa bình"},
        {"id": "g1-vd-20-8", "points": 20, "text": "Trong một tuần, nếu ngày hôm nay là thứ Tư thì ngày kia sẽ là thứ mấy?", "answer": "Thứ sáu"},
        {"id": "g1-vd-20-9", "points": 20, "text": "Cây cối thở và quang hợp nhả ra khí gì cần thiết cho con người hít thở?", "answer": "Khí oxi"},
        {"id": "g1-vd-20-10", "points": 20, "text": "Số tròn chục liền sau số 10 là số nào?", "answer": "Số 20"},

        # 7 câu 30 điểm
        {"id": "g1-vd-30-4", "points": 30, "text": "Một sợi dây dài 10cm, bị cắt bớt một đoạn dài 4cm. Hỏi đoạn dây còn lại dài bao nhiêu xăng-ti-mét?", "answer": "6cm"},
        {"id": "g1-vd-30-5", "points": 30, "text": "Vị lãnh tụ vĩ đại nào của dân tộc Việt Nam được các cháu thiếu nhi kính yêu gọi bằng 'Bác'?", "answer": "Bác Hồ (Chủ tịch Hồ Chí Minh)"},
        {"id": "g1-vd-30-6", "points": 30, "text": "Tìm một số biết rằng lấy số đó cộng với 3 rồi trừ đi 2 thì được kết quả bằng 7?", "answer": "Số 6"},
        {"id": "g1-vd-30-7", "points": 30, "text": "Ngày Nhà giáo Việt Nam nhằm tri ân các thầy cô giáo là ngày nào trong năm?", "answer": "20 tháng 11"},
        {"id": "g1-vd-30-8", "points": 30, "text": "Nhà An có 2 anh em trai. Mỗi người anh trai đều có 1 cô em gái út. Hỏi nhà An có tất cả bao nhiêu người con?", "answer": "3 người con"},
        {"id": "g1-vd-30-9", "points": 30, "text": "Động vật nào được mệnh danh là 'tàu ngầm của sa mạc' vì có thể nhịn nước nhiều ngày và có bướu trên lưng?", "answer": "Lạc đà"},
        {"id": "g1-vd-30-10", "points": 30, "text": "Hãy điền số tiếp theo vào dãy số sau: 2, 4, 6, 8, ...?", "answer": "Số 10"}
    ]
}
